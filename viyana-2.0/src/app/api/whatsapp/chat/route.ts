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
    console.error("[Groq API Error]", err.response?.data || err.message);
    throw new Error(`Groq API failed: ${JSON.stringify(err.response?.data || err.message)}`);
  }
}

export async function POST(req: Request) {
  try {
    const { message, remoteJid, senderName, isGroup, key, messageTimestamp } = await req.json();
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evo.aethelsolutions.in';
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '012F15E79DDC-42FA-B93E-5D1C5AD55E08';

    console.log(`[Viyana WhatsApp] Received message from ${senderName || 'Unknown'} (${remoteJid}): "${message}" | isGroup: ${isGroup}`);

    // 1. Group check: Correctly handle string 'false' vs boolean
    const isGroupChat = isGroup === true || isGroup === 'true' || remoteJid?.endsWith('@g.us');
    if (isGroupChat) {
      console.log(`[Viyana WhatsApp] Ignoring group message from ${remoteJid}`);
      return NextResponse.json({ reply: null, reason: 'Group message ignored' });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
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
   - If Current Lead Status is 'IGNORED_PERSONAL' or Known Purpose is 'Friendly/Personal', you MUST stay completely silent (isMandatoryToRespond: false, replyText: null) for ALL incoming messages.
   - If the incoming message is a brief acknowledgment or closing (e.g., "ok", "k", "sure", "thanks", "done", "bye", "okay", "good", "sari", "nandri"), you MUST stay completely silent (isMandatoryToRespond: false, replyText: null).
2. ELITE PROFESSIONAL TANGLISH (POLITE EXECUTIVE PERSONA):
   - Maintain a highly professional, respectful executive assistant persona. Do NOT use overly casual slang like "bro", "machan", or excessive exclamation marks. Use polite Tamil addressing ("sir / mam" or their name, and respectful pronouns like "neenga", "ungalukku").
   - Do NOT repeat the same greeting ("Vanakkam") in every message! Only use "Vanakkam" for the very first conversation opener.
   - Write in crisp, natural, conversational Tamil typed in English script (Tanglish) that flows contextually with what the user just said.
3. INITIAL GREETING (NEW CONTACTS): When a user sends an initial greeting or conversation opener (e.g., "hi", "hello", "vanakkam", "epdi irukeenga") and Known Purpose is 'None recorded yet', introduce yourself professionally in Tanglish:
   "Vanakkam! Naan Aethel Solutions Reshanth oda Executive AI Assistant Viyana pesuren. Neenga business inquiry aah reach out panringala, illa friendly conversation aah?"
4. SKIP PERSONAL / FRIENDLY CHATTER: If the user states they are reaching out for friendly/personal conversation or just casual chatter (e.g., "friendly", "friend than", "summa than", "personal"), extract "Friendly/Personal" into extractedLead.purpose, and politely inform them in Tanglish:
   "Kandippa! Reshanth ippo konjam meetings la busy aah irukkaru. Free aana udane ungalukku personal aah contact pannuvaaru. Nandri!"
5. COLLECTING PROJECT DETAILS & NAME (COLLECTING_INFO):
   - If the user shares business details (e.g., "Nan oru product sales panren", "Honey product"), acknowledge their specific business professionally without repeating introductions (e.g., "Kandippa panni tharalam. Honey product sales ku AI automation romba help aah irukkum.").
   - If Known Name is 'Unknown', politely ask for their name: "Unga name therinjikkalama?".
   - Extract their specific purpose (e.g., "Honey product sales AI automation") into extractedLead.purpose.
6. SUCCESSFUL WRAP-UP (QUALIFIED LEADS):
   - If Current Lead Status is 'QUALIFIED' (meaning their Purpose is already recorded) and the user shares additional details about their project, professionally confirm that everything is perfectly recorded for Reshanth:
     "Nandri! Unga project details ellaam pakka aah record aagidichu. Naan Reshanth kitta forward pannidren, avar free aana udane ungalukku call / WhatsApp pannuvaaru."
   - If Current Lead Status is 'QUALIFIED' and you have already sent the wrap-up confirmation, for any subsequent messages from them, set isMandatoryToRespond: false and replyText: null so you remain completely silent and let Reshanth take over!
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
    if (triageResult?.extractedLead?.name || triageResult?.extractedLead?.purpose || triageResult?.aiReasoning) {
      try {
        const client = await pool.connect();
        const extractedPurp = triageResult.extractedLead?.purpose || '';
        const isPersonal = extractedPurp.toLowerCase().includes('friend') || extractedPurp.toLowerCase().includes('personal') || extractedPurp.toLowerCase().includes('summa');
        const newStatus = isPersonal ? 'IGNORED_PERSONAL' : (extractedPurp ? 'QUALIFIED' : 'COLLECTING_INFO');
        const updateName = triageResult.extractedLead?.name || savedName;
        const updatePurpose = triageResult.extractedLead?.purpose || savedPurpose;
        await client.query(
          'UPDATE leads SET name = COALESCE($1, name), purpose = COALESCE($2, purpose), status = $3, ai_reason = $4, updated_at = NOW() WHERE phone = $5',
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
