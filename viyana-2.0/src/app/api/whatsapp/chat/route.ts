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
}

export async function POST(req: Request) {
  try {
    const { message, remoteJid, senderName, isGroup, key, messageTimestamp } = await req.json();
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evo.aethelsolutions.in';
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '012F15E79DDC-42FA-B93E-5D1C5AD55E08';

    console.log(`[Viyana WhatsApp] Received message from ${senderName || 'Unknown'} (${remoteJid}): "${message}"`);

    // 1. Group check: Ignore all group chats instantly
    if (isGroup || remoteJid?.endsWith('@g.us')) {
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
Your goal is to intelligently triage incoming WhatsApp messages from customers, business contacts, and acquaintances.

Context about current user:
- Phone / JID: ${remoteJid}
- Known Name: ${savedName || 'Unknown'}
- Known Purpose: ${savedPurpose || 'None recorded yet'}
- Current Lead Status: ${leadStatus}

Strict Behavioral Rules:
1. If the user's message is just a casual or friendly greeting with no business question or context (e.g., "hi", "hello", "hey bro", "good morning", "what's up"), mark isMandatoryToRespond: false and replyText: null. Reshanth does not want robot replies sent for casual friendly chatter.
2. If the user asks a business question, requests services, or seeks information, engage professionally, concisely, and warmly on behalf of Reshanth.
3. If lead info is incomplete (status COLLECTING_INFO or purpose unknown), politely ask for their full name and the specific purpose of their inquiry so you can save their contact for Reshanth.
4. If it is an important business inquiry or lead that Reshanth must review personally, set shouldMarkUnread: true.
5. If the user provides their name and/or purpose in the chat, extract them into extractedLead so the database can update.
6. Provide a concise explanation in aiReasoning detailing exactly why you decided to respond or stay silent, and your assessment of the user.

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
        const newStatus = triageResult.extractedLead?.purpose ? 'QUALIFIED' : 'COLLECTING_INFO';
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
