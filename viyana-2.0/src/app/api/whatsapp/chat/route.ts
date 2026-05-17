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
   - If Current Lead Status is 'IGNORED_PERSONAL' or Known Purpose is 'Friendly/Personal', you MUST stay completely silent (isMandatoryToRespond: false, replyText: null) for ALL incoming messages. Reshanth will reply personally when free. Never send automated replies to them again.
   - If the incoming message is a brief acknowledgment or closing (e.g., "ok", "k", "sure", "thanks", "done", "bye", "okay", "good"), you MUST stay completely silent (isMandatoryToRespond: false, replyText: null). Do NOT introduce yourself or ask questions!
2. MANDATORY TANGLISH RESPONSES: Every single automated reply you generate MUST be written in natural, respectful, and warm conversational Tanglish (Tamil words written in English characters, e.g., "Vanakkam! Naan Reshanth oda AI assistant Viyana pesuren"). Do NOT reply in clean English.
3. GREETINGS & INTRODUCTIONS: When a user sends an initial greeting or conversation opener (e.g., "hi", "hello", "vanakkam", "epdi irukeenga") and their purpose is unknown, introduce yourself in Tanglish as Reshanth's AI assistant and warmly ask if they are reaching out for a business inquiry or a friendly conversation:
   Example Tanglish reply: "Vanakkam! Naan Reshanth oda AI assistant Viyana pesuren. Neenga business inquiry aah message panringala, illa friendly conversation aah?"
4. SKIP PERSONAL / FRIENDLY CHATTER: If the user states they are reaching out for friendly/personal conversation or just casual chatter (e.g., "friendly", "friend than bro", "summa than", "personal"), you MUST extract "Friendly/Personal" into extractedLead.purpose, and warmly inform them in Tanglish that Reshanth will reply personally when free:
   Example Tanglish reply: "Kandippa bro! Reshanth ippo work la busy aah irukkaru. Free aana udane ungalukku personal aah reply pannuvaru!"
5. BUSINESS INQUIRY & LEAD QUALIFICATION: If the user reaches out for business, web design, AI telecallers, or software services, engage professionally in Tanglish. Ask for their specific project details and full name so you can save their lead for Reshanth.
6. LEAD EXTRACTION: If the user provides their name and/or business purpose, extract them into extractedLead so the database updates automatically.
7. EXPLANATION: In aiReasoning, concisely explain your decision based on the message content.

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
