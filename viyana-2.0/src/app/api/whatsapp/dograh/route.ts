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
        console.log("[Dograh AI Engine] Successfully processed triage with Gemini 2.5 Flash");
        return JSON.parse(textContent);
      }
    } catch (geminiErr: any) {
      console.warn("[Gemini Dograh Warning] Failed, falling back to Groq Llama 3...", geminiErr.response?.data?.error?.message || geminiErr.message);
    }
  }

  if (!groqKey) {
    throw new Error("No AI API keys configured");
  }

  console.log("[Dograh AI Engine] Calling Groq Llama 3...");
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
        console.warn(`[Dograh Telecaller] Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${attempt + 1} of ${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
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

    console.log(`[Dograh Telecaller] Received from ${senderName || 'Unknown'} (${remoteJid}) | isGroup: ${isGroupChat} | fromMe: ${isFromMe} | msg: "${message}"`);

    if (isFromMe) {
      return NextResponse.json({ reply: null, reason: 'Ignored outgoing self message' });
    }

    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI API keys not configured' }, { status: 500 });
    }

    // Lookup business lead status in PostgreSQL
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
        await client.query(
          'INSERT INTO leads (phone, name, status) VALUES ($1, $2, $3) ON CONFLICT (phone) DO NOTHING',
          [remoteJid, senderName || 'Business Owner', 'COLLECTING_INFO']
        );
      }
      client.release();
    } catch (dbErr: any) {
      console.error(`[Dograh Database Warning]`, dbErr.message);
    }

    // AI System Prompt for Dograh (AI Automation Agency Telecaller & Lead Specialist)
    const systemPrompt = `You are Dograh (டோக்ரா), an elite AI Automation Consultant & Telecaller representing Aethel Solutions / Viyana.
Your primary objective is to converse fluently and professionally with business owners in Tamil script (e.g., 'வணக்கம் சார், நான் ஏதெல் சொல்யூஷன்ஸில் இருந்து டோக்ரா பேசுகிறேன்...') or natural Tanglish, understanding their business model, qualifying their AI automation needs (WhatsApp bots, voice AI, n8n workflows), and preparing their requirements for Google Sheets recording.
You must output your response strictly in JSON format.

Context about current business client:
- Phone / JID: ${remoteJid}
- Known Client Name: ${savedName || 'Unknown'}
- Recorded AI Automation Requirements: ${savedPurpose || 'None recorded yet'}
- Current Lead Status: ${leadStatus}
- Minutes Since Last Update: ${minutesSinceLastUpdate} minutes

CRITICAL RULES (IN ORDER OF PRIORITY):
1. LANGUAGE & PROFESSIONAL TONE:
   - Converse fluently in professional executive Tamil script or crisp Tanglish based on the client's message.
   - Use highly polite business addressing ("சார் / மேடம் / Sir / Mam"). Keep sentences crisp and engaging.

2. GREETING & VALUE PROPOSITION:
   - If Known Requirements is 'None recorded yet', greet warmly in Tamil/Tanglish, introduce yourself as Dograh from Aethel Solutions, and ask about their business and automation needs.
     Example: "வணக்கம் சார்! நான் ஏதெல் சொல்யூஷன்ஸில் இருந்து AI எக்ஸிகியூட்டிவ் டோக்ரா பேசுகிறேன். உங்கள் பிசினஸுக்கு வாட்ஸ்அப் ஆட்டோமேஷன், AI டெலிகாலர் அல்லது கஸ்டமர் சப்போர்ட் போட் தேவைகள் உள்ளதா?"

3. COLLECTING BUSINESS REQUIREMENTS:
   - Ask about their company name, industry (Ecom, Real Estate, Healthcare, etc.), and major operational bottlenecks.
   - Summarize their specific AI automation requirements into extractedLead.purpose (e.g. "Needs WhatsApp Lead Closer bot and n8n Google Sheets integration").
   - If Client Name or Company Name is unknown, politely ask for it.

4. SUCCESSFUL WRAP-UP (QUALIFIED LEAD):
   - Once you have collected their name and exact AI requirement, deliver an elite wrap-up confirmation in Tamil/Tanglish informing them that their project details have been logged for our core technical team.
     Example: "நன்றி சார்! உங்கள் AI ஆட்டோமேஷன் தேவைகள் மற்றும் ப்ராஜெக்ட் விவரங்கள் எங்கள் சிஸ்டமில் பதிவு செய்யப்பட்டுள்ளன. எங்களது பவுண்டர் ரேஷாந்த் அல்லது எங்கள் அட்மின் டீம் உங்களை விரைவில் டெமோவுடன் தொடர்புகொள்வார்கள்."
   - Once confirmed, set Current Lead Status to 'QUALIFIED'. If already qualified and they just say 'ok / thanks', remain silent (isMandatoryToRespond: false).

5. EXPLANATION: In aiReasoning, concisely assess the lead quality and potential contract value for internal agency notes.

You MUST respond strictly as a JSON object matching this exact schema:
{
  "aiReasoning": "String explaining lead qualification and agency sales assessment",
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
    console.log(`[Dograh Telecaller Triage Result]`, JSON.stringify(triageResult, null, 2));

    let finalLeadState = {
      name: savedName || senderName || 'Unknown',
      purpose: savedPurpose,
      status: leadStatus
    };

    if (triageResult?.extractedLead?.name || triageResult?.extractedLead?.purpose || triageResult?.aiReasoning || triageResult?.isMandatoryToRespond) {
      try {
        const client = await pool.connect();
        let updatePurpose = triageResult.extractedLead?.purpose || savedPurpose;
        const updateName = triageResult.extractedLead?.name || savedName;
        const hasValidPurpose = updatePurpose && updatePurpose.trim().length > 3;
        const hasValidName = updateName && updateName.toLowerCase() !== 'unknown';
        const isAlreadyQualified = leadStatus === 'QUALIFIED';
        
        const newStatus = (isAlreadyQualified || (hasValidPurpose && hasValidName)) ? 'QUALIFIED' : 'COLLECTING_INFO';
        
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
        console.error(`[Dograh Database Update Warning]`, dbErr.message);
      }
    }

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
      } catch (evoErr: any) {}
    }

    const finalReply = triageResult?.isMandatoryToRespond ? triageResult.replyText : null;

    return NextResponse.json({
      reply: finalReply,
      triage: triageResult,
      lead: finalLeadState,
      googleSheetPayload: {
        phone: remoteJid,
        clientName: finalLeadState.name,
        aiRequirements: finalLeadState.purpose || "Exploring AI Solutions",
        status: finalLeadState.status,
        salesAssessment: triageResult?.aiReasoning || "In progress",
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error(`[Dograh Telecaller Error]`, error?.response?.data || error.message);
    return NextResponse.json({ error: 'Failed to process Dograh telecaller request', details: error.message }, { status: 500 });
  }
}
