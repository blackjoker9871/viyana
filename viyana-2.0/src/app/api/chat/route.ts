import { OpenAIStream, StreamingTextResponse } from 'ai';

export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const { messages, modelId } = await req.json();
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    const targetModel = modelId === 'viyana-fast' ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile';
    console.log(`[Viyana Web UI] Processing chat using Groq (${targetModel}) for modelId ${modelId}`);

    const systemPrompt = modelId === 'dograh-tamil'
      ? `You are Dograh (டோக்ரா), an elite AI Automation Consultant & Telecaller representing Aethel Solutions / Viyana.
         Your goal is to converse fluently and professionally with the user in Tamil script (e.g., 'வணக்கம் சார், நான் ஏதெல் சொல்யூஷன்ஸில் இருந்து டோக்ரா பேசுகிறேன்...') or natural Tanglish matching their preference. Inquire about their business model, current bottlenecks, and qualify their AI automation needs (WhatsApp bots, customer support agents, n8n workflows). If they need to log their business lead to Google Sheets or trigger automation, append a hidden JSON block at the very end:
         { "automation": { "action": "sync_google_sheets", "data": { "clientName": "Name", "aiRequirements": "Summary" }, "reason": "Business lead logged" } }`
      : `You are Viyana, a powerful AI business assistant.
      Your goal is to assist with business tasks and automation.
      If the user wants to send a WhatsApp message, or if a task requires sending a notification, add a hidden JSON block at the VERY END of your message.

      JSON FORMATS:
      1. For WhatsApp: { "automation": { "action": "whatsapp_message", "data": { "phone": "number", "message": "content" }, "reason": "Sending info" } }
      2. For Business Data: { "automation": { "action": "add_expense", "data": { "amount": 100, "item": "name" }, "reason": "Logged" } }
      
      Only add JSON for actions. Otherwise, chat naturally.`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    ];

    let response: Response | undefined;
    const maxRetries = 3;
    let delay = 1000; // 1 second

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: formattedMessages,
          stream: true,
        }),
      });

      if (response.ok) {
        break;
      }

      if (response.status === 429 && attempt < maxRetries) {
        console.warn(`[Viyana Web UI] Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${attempt + 1} of ${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        break;
      }
    }

    if (!response || !response.ok) {
      const err = response ? await response.text() : 'Failed to fetch from Groq';
      const status = response ? response.status : 500;
      return new Response(JSON.stringify({ error: 'Groq API Error', details: err }), { status });
    }

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);

  } catch (error: any) {
    console.error(`[Viyana Web UI Error]`, error?.message || error);
    return new Response(JSON.stringify({ error: 'Processing Failed', details: error.message }), { status: 500 });
  }
}
