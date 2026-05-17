import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { action, data, reason } = await req.json();
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

    console.log(`📡 [Manual Trigger] Sending POST to: ${N8N_WEBHOOK_URL}`);

    if (!N8N_WEBHOOK_URL) {
      return NextResponse.json({ success: false, error: 'n8n Webhook URL not configured' }, { status: 500 });
    }

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: action || 'ai_whatsapp_automation',
        message: data.message || '',
        phone: data.phone || '',
        metadata: {
          reason: reason || 'Triggered via Viyana AI',
          timestamp: new Date().toISOString(),
          source: 'Viyana Ultra Engine'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n responded with ${response.status}: ${errorText}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Workflow triggered successfully' 
    });
  } catch (error: any) {
    console.error('❌ [Manual Trigger] Failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
