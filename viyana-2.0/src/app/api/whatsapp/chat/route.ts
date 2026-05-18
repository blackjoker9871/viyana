import { NextResponse } from 'next/server';
import axios from 'axios';
import { Pool } from 'pg';

export const maxDuration = 60;

// Initialize Supabase PostgreSQL Pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function callGroqTriage(prompt: string, systemPrompt: string, apiKey: string) {
  const maxRetries = 3;
  let delay = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      }, {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
      });
      return JSON.parse(res.data.choices[0].message.content);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 429 && attempt < maxRetries) {
        console.warn(`[Viyana WhatsApp] Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${attempt + 1} of ${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        console.error("[Groq API Error]", err.response?.data || err.message);
        throw new Error(`Groq API failed: ${JSON.stringify(err.response?.data || err.message)}`);
      }
    }
  }
}

export async function POST(req: Request) {
  try {
    const { message, remoteJid, senderName, isGroup, groupName, fromMe, key, messageTimestamp } = await req.json();
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evo.aethelsolutions.in';
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '012F15E79DDC-42FA-B93E-5D1C5AD55E08';

    const isFromMe = fromMe === true || fromMe === 'true' || key?.fromMe === true;
    const isGroupChat = isGroup === true || isGroup === 'true' || remoteJid?.endsWith('@g.us');
    const isViyanaGroup = groupName === 'Viyana' || (isGroupChat && groupName === 'Viyana');

    console.log(`[Viyana WhatsApp] Received from ${senderName || 'Unknown'} (${remoteJid}) | isGroup: ${isGroupChat} | isViyanaGroup: ${isViyanaGroup} | fromMe: ${isFromMe} | msg: "${message}"`);

    // 1. Guard against Reshanth's own messages in other chats
    if (isFromMe && !isViyanaGroup) {
      console.log(`[Viyana WhatsApp] Ignoring Reshanth's own outgoing message in non-Viyana chat (${remoteJid})`);
      return NextResponse.json({ reply: null, reason: 'Ignored outgoing self message' });
    }

    // 2. Guard against all other group chats
    if (isGroupChat && !isViyanaGroup) {
      console.log(`[Viyana WhatsApp] Ignoring message from non-Viyana group (${remoteJid})`);
      return NextResponse.json({ reply: null, reason: 'Group message ignored' });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    // 3. Special direct command mode for Viyana Group
    if (isViyanaGroup) {
      console.log(`[Viyana WhatsApp] Command received in Viyana Group: "${message}"`);
      const bossPrompt = `You are Viyana, Reshanth's personal AI Executive Assistant. Reshanth is communicating with you directly in your private command group.
Your task is to assist Reshanth directly, answer his questions, or confirm actions.
Respond naturally, politely, and concisely matching his language (English or Tanglish). Do not format as JSON, just output the exact text reply.`;

      try {
        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: bossPrompt },
            { role: 'user', content: message || '' }
          ]
        }, {
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
        });
        const replyText = res.data.choices[0].message.content;
        return NextResponse.json({ reply: replyText, isCommandReply: true });
      } catch (err: any) {
        console.error("[Viyana Group AI Error]", err.message);
        return NextResponse.json({ reply: "Sorry Reshanth, I encountered an error processing your command." });
      }
    }

    // 2. Lookup lead status in Supabase PostgreSQL
    let leadStatus = 'COLLECTING_INFO';
    let savedName = senderName;
    let savedPurpose = null;

    try {
      const client = await pool.connect();
      const res = await client.query('SELECT name, purpose, status FROM leads WHERE phone = $1', [remoteJid]);
      if (res.rows.length > 0) {
        leadStatus = res.rows[0].status;
        savedName = res.rows[0].name || senderName;
        savedPurpose = res.rows[0].purpose;
      } else {
        // Insert new lead
        await client.query(
          'INSERT INTO leads (phone, name, status) VALUES ($1, $2, $3) ON CONFLICT (phone) DO NOTHING',
          [remoteJid, senderName || 'User', 'COLLECTING_INFO']
        );
      }
      client.release();
    } catch (dbErr: any) {
      console.error(`[Viyana Database Warning]`, dbErr.message);
    }

    // 3. AI Triage & Response Generation
    const systemPrompt = `You are Viyana, an elite AI Executive Assistant managing WhatsApp communications for Reshanth (Business Owner of Aethel Solutions).
Your goal is to intelligently triage incoming WhatsApp messages. You must output your response strictly in JSON format.

Context about current user:
- Phone / JID: ${remoteJid}
- Known Name: ${savedName || 'Unknown'}
- Known Purpose: ${savedPurpose || 'None recorded yet'}
- Current Lead Status: ${leadStatus}

CRITICAL RULES (IN ORDER OF PRIORITY):
1. ABSOLUTE SILENCE FOR PERSONAL CHAT & ACKNOWLEDGMENTS (CRITICAL!):
   - If Current Lead Status is 'IGNORED_PERSONAL' or Known Purpose is 'Friendly/Personal', you MUST stay completely silent for incoming messages UNLESS the user explicitly states they want to discuss a business inquiry, project, or says "business" / "work". If they mention business, you MUST respond and transition them to business mode!
   - If the incoming message is a brief acknowledgment or closing (e.g., "ok", "k", "sure", "thanks", "done", "bye", "okay", "good", "sari", "nandri"), you MUST stay completely silent (isMandatoryToRespond: false, replyText: null).

2. LANGUAGE & SCRIPT MIRRORING (CRITICAL!):
   - You MUST detect the language and script of the user's incoming message and match it exactly:
     * If the user writes in pure English (e.g., "I am looking for AI automation for my business", "Hi rishanth", "Business", "Buisness"): Reply strictly in elite professional English.
     * If the user writes in Tamil script (e.g., "வணக்கம், எனக்கு ஒரு உதவி தேவை"): Reply strictly in formal, polite Tamil script.
     * If the user writes in Tanglish / Romanized Tamil (e.g., "Nan oru product sales panren"): Reply strictly in crisp, natural Tanglish.
   - For Tanglish replies, NEVER invent strange phonetics or unnatural words (like "parupeakaren"). Use standard vocabulary: "Neenga", "Ungalukku", "Unga", "Pesuren", "Sollunga", "Kandippa", "Panni tharalam", "Theliva puriyuthu", "Help aah irukkum", "Therinjikkalama?", "Forward pannidren".
   - Maintain a highly professional executive persona across all languages. Do NOT use casual slang like "bro" or "machan". Use polite addressing ("sir / mam" or their name).
   - Do NOT repeat greetings ("Vanakkam" / "Hello") in every message! Only use it for the very first conversation opener.

3. INITIAL GREETING (NEW CONTACTS): When a user sends an initial opener and Known Purpose is 'None recorded yet', introduce yourself professionally matching their language:
   - English: "Hello! I am Viyana, Executive AI Assistant to Reshanth at Aethel Solutions. Are you reaching out for a business inquiry or a friendly conversation?"
   - Tanglish: "Vanakkam! Naan Aethel Solutions Reshanth oda Executive AI Assistant Viyana pesuren. Neenga business inquiry aah reach out panringala, illa friendly conversation aah?"

4. SKIP PERSONAL / FRIENDLY CHATTER: If the user states they are reaching out for friendly/personal conversation, extract "Friendly/Personal" into extractedLead.purpose, and politely inform them matching their language:
   - English: "Certainly! Reshanth is currently in meetings. He will reach out to you personally as soon as he is free. Thank you!"
   - Tanglish: "Kandippa! Reshanth ippo konjam meetings la busy aah irukkaru. Free aana udane ungalukku personal aah contact pannuvaaru. Nandri!"

5. COLLECTING PROJECT DETAILS & NAME (COLLECTING_INFO):
   - If the user simply answers "Business" (or "Buisness") to the greeting but hasn't shared specific project details yet, enthusiastically acknowledge it matching their language. Example (English): "Wonderful! Please share a brief overview of your business or what kind of AI assistance you are looking for." Example (Tanglish): "Kandippa sir. Unga business requirements theliva sollunga, AI automation eppadi help pannum nu paarkalam."
   - When the user shares specific business details (e.g., "Nan oru product sales panren", "Enaku ai telecaller venum"), acknowledge their specific business professionally. If you don't know their company name or personal name yet, ask for it matching their language ("May I know your company/personal name, please?" / "Unga name or company name theliva sollunga sir.").
   - Extract their specific purpose into extractedLead.purpose. If they only said "business", do NOT extract "business" as the final purpose yet.

6. SUCCESSFUL WRAP-UP (FINAL CONFIRMATION):
   - When the user provides their name or company name (e.g., "Lemuria", "Rajesh") in response to your question, or when they have provided both their project requirements AND name:
     Extract their name into extractedLead.name. You MUST respond with the final wrap-up confirmation matching their language:
     - English: "Thank you! All your project details have been successfully recorded. I will forward this to Reshanth, and he will get in touch with you shortly."
     - Tanglish: "Nandri sir! Unga project details ellaam pakka aah record aagidichu. Naan Reshanth kitta forward pannidren, avar free aana udane ungalukku call / WhatsApp pannuvaaru."
   - Once you have sent this final wrap-up confirmation (or if Current Lead Status is 'QUALIFIED' and they are just sending brief acknowledgments like "ok", "thanks"), set isMandatoryToRespond: false and replyText: null to remain completely silent!

7. EXPLANATION: In aiReasoning, concisely explain your decision based on the message content and lead status.

You MUST respond strictly as a JSON object matching this exact schema:
{
  "aiReasoning": "String explaining your decision and assessment of the message",
  "isFriendlyOrCasual": boolean,
  "isMandatoryToRespond": boolean,
  "replyText": string | null,
  "shouldMarkUnread": boolean,
  "extractedLead": {
    "name": string | null,
    "purpose": string | null
  }
}`;

    const triageResult = await callGroqTriage(message || '', systemPrompt, GROQ_API_KEY);
    console.log(`[Viyana AI Triage Result]`, JSON.stringify(triageResult, null, 2));

    // 4. Update Lead in Database if extracted
    if (triageResult?.extractedLead?.name || triageResult?.extractedLead?.purpose || triageResult?.aiReasoning || triageResult?.isMandatoryToRespond) {
      try {
        const client = await pool.connect();
        const extractedPurp = triageResult.extractedLead?.purpose || '';
        const isPersonal = extractedPurp.toLowerCase().includes('friend') || extractedPurp.toLowerCase().includes('personal') || extractedPurp.toLowerCase().includes('summa');
        
        let updatePurpose = triageResult.extractedLead?.purpose || savedPurpose;
        if (!isPersonal && !triageResult.isFriendlyOrCasual && savedPurpose?.toLowerCase().includes('friend')) {
          // If transitioning from Friendly/Personal back to business mode, clear out the old personal purpose
          updatePurpose = extractedPurp && extractedPurp.toLowerCase() !== 'friendly/personal' ? extractedPurp : null;
        }

        const isGeneralBusinessWord = extractedPurp.toLowerCase() === 'business' || extractedPurp.toLowerCase() === 'buisness';
        const updateName = triageResult.extractedLead?.name || savedName;
        const hasValidPurpose = updatePurpose && !isGeneralBusinessWord && updatePurpose.toLowerCase() !== 'friendly/personal';
        const hasValidName = updateName && updateName.toLowerCase() !== 'unknown';
        
        const newStatus = isPersonal ? 'IGNORED_PERSONAL' : ((hasValidPurpose && hasValidName && triageResult.extractedLead?.name) ? 'QUALIFIED' : 'COLLECTING_INFO');
        
        await client.query(
          'UPDATE leads SET name = COALESCE($1, name), purpose = $2, status = $3, ai_reason = $4, updated_at = NOW() WHERE phone = $5',
          [updateName, updatePurpose, newStatus, triageResult.aiReasoning || null, remoteJid]
        );
        client.release();
      } catch (dbErr: any) {
        console.error(`[Viyana Lead Update Warning]`, dbErr.message);
      }
    }

    // 5. Mark Chat Unread in Evolution API if flagged
    if (triageResult?.shouldMarkUnread && key) {
      try {
        await axios.post(`${EVOLUTION_API_URL}/chat/markChatUnread/viyana-bot`, {
          number: remoteJid,
          lastMessage: {
            key: key,
            messageTimestamp: messageTimestamp || Math.floor(Date.now() / 1000)
          }
        }, {
          headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' }
        });
        console.log(`[Viyana WhatsApp] Marked chat unread for ${remoteJid}`);
      } catch (evoErr: any) {
        console.error(`[Viyana MarkUnread Warning]`, evoErr?.response?.data || evoErr.message);
      }
    }

    // 6. Return response for n8n
    // If isMandatoryToRespond is false, return reply: null so n8n stays silent
    const finalReply = triageResult?.isMandatoryToRespond ? triageResult.replyText : null;

    return NextResponse.json({
      reply: finalReply,
      triage: triageResult
    });

  } catch (error: any) {
    console.error(`[Viyana WhatsApp Error]`, error?.response?.data || error.message);
    return NextResponse.json({ error: 'Failed to process WhatsApp request', details: error.message }, { status: 500 });
  }
}
