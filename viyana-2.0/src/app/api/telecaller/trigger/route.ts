import { NextResponse } from 'next/server';
import axios from 'axios';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export async function POST(req: Request) {
  try {
    const { phone, prompt, campaign } = await req.json();

    console.log(`[Telecaller Trigger] Dispatching outbound AI voice call to ${phone} | Campaign: ${campaign}`);

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    // Optional: Log outbound call request in Supabase database
    try {
      const client = await pool.connect();
      await client.query(
        `INSERT INTO leads (phone, name, status, purpose, ai_reason, updated_at) 
         VALUES ($1, 'Outbound Lead', 'COLLECTING_INFO', $2, 'Triggered outbound AI voice call', NOW())
         ON CONFLICT (phone) DO UPDATE 
         SET status = 'COLLECTING_INFO', ai_reason = 'Triggered outbound AI voice call', updated_at = NOW()`,
        [phone, campaign || 'Voice Campaign']
      );
      client.release();
    } catch (dbErr: any) {
      console.warn('[Telecaller DB Log Warning]', dbErr.message);
    }

    // Call Dograh Voice Engine API (running on port 8000 or via n8n bridge)
    const DOGRAH_API_KEY = process.env.DOGRAH_API_KEY;
    const DOGRAH_AGENT_ID = process.env.DOGRAH_AGENT_ID || '1';
    const DOGRAH_TELEPHONY_CONFIG_ID = process.env.DOGRAH_TELEPHONY_CONFIG_ID;
    const DOGRAH_FROM_PHONE_NUMBER_ID = process.env.DOGRAH_FROM_PHONE_NUMBER_ID;
    
    // Default to official Dograh telephony trigger if API key is present, otherwise fallback to old port 8000 URL
    const VOICE_API_URL = process.env.VOICE_API_URL || (DOGRAH_API_KEY ? 'https://voice.aethelsolutions.in/api/v1/telephony/initiate-call' : 'http://35.200.216.19:8000/call');
    
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let payload: any = {};

      if (DOGRAH_API_KEY) {
        // Dograh / Bolna Initiate Call API Format (X-API-Key authenticated)
        headers['X-API-Key'] = DOGRAH_API_KEY;
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
        payload = {
          workflow_id: parseInt(DOGRAH_AGENT_ID, 10),
          phone_number: formattedPhone
        };
        if (DOGRAH_TELEPHONY_CONFIG_ID) {
          payload.telephony_configuration_id = parseInt(DOGRAH_TELEPHONY_CONFIG_ID, 10);
        }
        if (DOGRAH_FROM_PHONE_NUMBER_ID) {
          payload.from_phone_number_id = parseInt(DOGRAH_FROM_PHONE_NUMBER_ID, 10);
        }
      } else {
        // Fallback FastAPI Custom Engine Format
        payload = {
          destination: phone,
          system_prompt: prompt || 'You are Viyana Voice Assistant calling from Aethel Solutions.',
          campaign_name: campaign || 'Viyana Outbound',
          api_keys: {
            deepgram: DEEPGRAM_API_KEY,
            groq: GROQ_API_KEY
          }
        };
      }

      console.log(`[Telecaller Trigger] POSTing to ${VOICE_API_URL} with payload:`, JSON.stringify(payload, null, 2));

      const callRes = await axios.post(VOICE_API_URL, payload, {
        headers,
        timeout: 10000
      });

      return NextResponse.json({
        success: true,
        message: 'Outbound call triggered successfully',
        callId: callRes.data?.execution_id || callRes.data?.call_id || 'sip-' + Date.now(),
        gateway_response: callRes.data
      });
    } catch (voiceErr: any) {
      console.warn('[Direct Voice API Warning] Attempting n8n Fallback Webhook...', voiceErr.response?.data || voiceErr.message);

      // Fallback: Trigger via n8n webhook if direct SIP API is unreachable
      const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
      if (N8N_WEBHOOK_URL) {
        await axios.post(N8N_WEBHOOK_URL, {
          action: 'trigger_outbound_call',
          phone: phone,
          prompt: prompt,
          campaign: campaign
        });
        return NextResponse.json({
          success: true,
          message: 'Outbound call dispatched via n8n automation bridge',
          callId: 'n8n-' + Date.now()
        });
      }

      throw voiceErr;
    }

  } catch (error: any) {
    console.error('❌ [Telecaller Trigger Error]', error?.response?.data || error.message);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to initiate AI telecaller call', 
      details: error.message 
    }, { status: 500 });
  }
}
