import { NextResponse } from 'next/server';
import axios from 'axios';
import { Pool } from 'pg';

export const maxDuration = 60;

// Initialize Supabase PostgreSQL Pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function callAITriage(prompt: string, systemPrompt: string, groqKey?: string, geminiKey?: string) {
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json" }
      };
      const res = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
      const textContent = res.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textContent) {
        console.log("[Viyana AI Engine] Successfully processed triage with Gemini 2.5 Flash");
        return JSON.parse(textContent);
      }
    } catch (geminiErr: any) {
      console.warn("[Gemini Triage Warning] Failed, falling back to Groq Llama 3...", geminiErr.response?.data?.error?.message || geminiErr.message);
    }
  }

  if (!groqKey) {
    throw new Error("No AI API keys configured");
  }

  console.log("[Viyana AI Engine] Calling Groq Llama 3...");
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
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' }
      });
      return JSON.parse(res.data.choices[0].message.content);
    } catch (err: any) {
      if (err.response?.status === 429 && attempt < maxRetries) {
        console.warn(`[Viyana WhatsApp] Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${attempt + 1} of ${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
}

async function callAICommand(prompt: string, bossPrompt: string, groqKey?: string, geminiKey?: string) {
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: bossPrompt }] }
      };
      const res = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
      const textContent = res.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textContent) {
        console.log("[Viyana AI Engine] Successfully processed command with Gemini 2.5 Flash");
        return textContent;
      }
    } catch (geminiErr: any) {
      console.warn("[Gemini Command Warning] Failed, falling back to Groq Llama 3...", geminiErr.response?.data?.error?.message || geminiErr.message);
    }
  }

  if (!groqKey) return "Sorry Reshanth, AI keys are not configured.";

  const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: bossPrompt },
      { role: 'user', content: prompt }
    ]
  }, {
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' }
  });
  return res.data.choices[0].message.content;
}

export async function POST(req: Request) {
  try {
    const { message, remoteJid, senderName, isGroup, groupName, fromMe, key, messageTimestamp } = await req.json();
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
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

    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI API keys not configured' }, { status: 500 });
    }

    // 3. Special direct command mode for Viyana Group
    if (isViyanaGroup) {
      console.log(`[Viyana WhatsApp] Command received in Viyana Group: "${message}"`);
      const bossPrompt = `You are Viyana, Reshanth's personal AI Executive Assistant. Reshanth is communicating with you directly in your private command group.
Your task is to assist Reshanth directly, answer his questions, or confirm actions.
Respond naturally, politely, and concisely matching his language (English or Tanglish). Do not format as JSON, just output the exact text reply.`;

      try {
        const replyText = await callAICommand(message || '', bossPrompt, GROQ_API_KEY, GEMINI_API_KEY);
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
    let minutesSinceLastUpdate = 9999;

    try {
      const client = await pool.connect();
      const res = await client.query('SELECT name, purpose, status, updated_at FROM leads WHERE phone = $1', [remoteJid]);
      if (res.rows.length > 0) {
        leadStatus = res.rows[0].status;
        savedName = res.rows[0].name || senderName;
        savedPurpose = res.rows[0].purpose;
        if (res.rows[0].updated_at) {
          const diffMs = Date.now() - new Date(res.rows[0].updated_at).getTime();
          minutesSinceLastUpdate = Math.floor(diffMs / (1000 * 60));
        }
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
- Minutes Since Last Update: ${minutesSinceLastUpdate} minutes

CRITICAL RULES (IN ORDER OF PRIORITY):
1. FOLLOW-UP & SILENCE RULES FOR QUALIFIED LEADS (CRITICAL BUSINESS LOGIC!):
   - If Current Lead Status is 'QUALIFIED':
     * If the incoming message is a brief acknowledgment or closing (e.g., "ok", "k", "sure", "thanks", "done", "bye", "okay", "good", "sari", "nandri", "hmm"), you MUST stay completely silent (isMandatoryToRespond: false, replyText: null) so you don't loop or spam.
     * If the user initiates a chat, asks a question, or requests something new, you MUST ALWAYS respond politely acknowledging their already recorded requirement and asking if they need any additional service. Example matching their language:
       - English: "Hello sir! Your request for [Known Purpose] is already securely recorded with us. Do you need any other service or assistance?"
       - Tanglish: "Vanakkam sir! Unga [Known Purpose] requirement engaloda system la pakka aah record aagidichu. Ungalukku vera yethavathu service thevai padutha?"
       (When replying this way, set isMandatoryToRespond: true).
   - If Current Lead Status is 'IGNORED_PERSONAL' or Known Purpose is 'Friendly/Personal', you MUST stay completely silent for incoming messages UNLESS the user explicitly states they want to discuss a business inquiry, project, or says "business" / "work". If they mention business, you MUST respond and transition them to business mode!

2. LANGUAGE & SCRIPT MIRRORING (CRITICAL!):
   - You MUST detect the language and script of the user's incoming message and match it exactly:
     * If the user writes in pure English (e.g., "I am looking for AI automation for my business", "Hi rishanth", "Business", "Buisness"): Reply strictly in elite professional English.
     * If the user writes in Tamil script (e.g., "வணக்கம், எனக்கு ஒரு உதவி தேவை"): Reply strictly in formal, polite Tamil script.
     * If the user writes in Tanglish / Romanized Tamil (e.g., "Nan oru product sales panren", "Pitch deck epdi ready pannanum"): Reply strictly in crisp, natural Tanglish.
   - For Tanglish replies, NEVER invent strange phonetics or unnatural words. Keep sentences crisp and highly professional. Use standard vocabulary: "Neenga", "Ungalukku", "Unga", "Pesuren", "Sollunga", "Kandippa", "Panni tharalam", "Theliva puriyuthu", "Help aah irukkum", "Therinjikkalama?", "Forward pannidren".
   - Maintain a highly professional executive persona across all languages. Do NOT use casual slang like "bro" or "machan". Use polite addressing ("sir / mam" or their name).
   - Do NOT repeat greetings ("Vanakkam" / "Hello") in every message! Only use it for the very first conversation opener.

3. INITIAL GREETING (NEW CONTACTS): When a user sends an initial opener and Known Purpose is 'None recorded yet', introduce yourself professionally matching their language:
   - English: "Hello! I am Viyana, Executive AI Assistant to Reshanth at Aethel Solutions. Are you reaching out for a business inquiry or a friendly conversation?"
   - Tanglish: "Vanakkam! Naan Aethel Solutions Reshanth oda Executive AI Assistant Viyana pesuren. Neenga business inquiry aah reach out panringala, illa friendly conversation aah?"

4. SKIP PERSONAL / FRIENDLY CHATTER: If the user states they are reaching out for friendly/personal conversation, extract "Friendly/Personal" into extractedLead.purpose, and politely inform them matching their language:
   - English: "Certainly! Reshanth is currently in meetings. He will reach out to you personally as soon as he is free. Thank you!"
   - Tanglish: "Kandippa! Reshanth ippo konjam meetings la busy aah irukkaru. Free aana udane ungalukku personal aah contact pannuvaaru. Nandri!"

5. COLLECTING PROJECT DETAILS & NAME (COLLECTING_INFO):
   - If the user simply answers "Business" (or "Buisness") but hasn't shared specific details yet, ask for an overview matching their language. Example: "Wonderful! Please share a brief overview of your business or what kind of AI assistance you are looking for."
   - If Known Purpose is 'None recorded yet' and they share specific requirements (e.g., "Nan oru product sales panren", "I need an ai telecaller"), extract it into extractedLead.purpose. If Known Name is 'Unknown', professionally acknowledge their business and ask for their company or personal name ("May I know your company or personal name, please?" / "Unga name or company name theliva sollunga sir.").
   - CRITICAL NAME EXTRACTION RULE: If Known Purpose is already recorded (e.g., "AI telecaller") and Known Name is 'Unknown', and the user replies with any name, single word, or company name (e.g., "Lemuria", "Rajesh", "Acme"), you MUST extract that exact text into extractedLead.name AND IMMEDIATELY jump to Rule 6 (SUCCESSFUL WRAP-UP) to deliver the closing confirmation! Do NOT ask any more questions!

6. SUCCESSFUL WRAP-UP (QUALIFIED LEADS & FINAL CONFIRMATION):
   - Whenever you have successfully gathered BOTH a valid business requirement AND their name / company name (either already recorded or extracted in the current message), you MUST immediately conclude the conversation by delivering this final wrap-up confirmation matching their language:
     - English: "Thank you sir! All your project details have been successfully recorded. Either our AI telecaller or our admins will contact you shortly to discuss further."
     - Tanglish: "Nandri sir! Unga project details ellaam pakka aah record aagidichu. Engaloda AI telecaller or engaloda admins koodiya seekiram ungalukku call / WhatsApp pannuvaanga."
   - Once you have sent this final wrap-up confirmation, set Current Lead Status to 'QUALIFIED', and set isMandatoryToRespond: false and replyText: null.

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

    const triageResult = await callAITriage(message || '', systemPrompt, GROQ_API_KEY, GEMINI_API_KEY);
    console.log(`[Viyana AI Triage Result]`, JSON.stringify(triageResult, null, 2));

    // 4. Update Lead in Database if extracted
    let finalLeadState = {
      name: savedName || senderName || 'Unknown',
      purpose: savedPurpose,
      status: leadStatus
    };

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
        const isAlreadyQualified = leadStatus === 'QUALIFIED';
        
        const newStatus = isPersonal ? 'IGNORED_PERSONAL' : ((isAlreadyQualified || (hasValidPurpose && hasValidName)) ? 'QUALIFIED' : 'COLLECTING_INFO');
        
        finalLeadState = {
          name: updateName || savedName || senderName || 'Unknown',
          purpose: updatePurpose,
          status: newStatus
        };

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
      triage: triageResult,
      lead: finalLeadState
    });

  } catch (error: any) {
    console.error(`[Viyana WhatsApp Error]`, error?.response?.data || error.message);
    return NextResponse.json({ error: 'Failed to process WhatsApp request', details: error.message }, { status: 500 });
  }
}
