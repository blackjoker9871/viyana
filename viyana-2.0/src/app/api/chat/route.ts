import { OpenAIStream, StreamingTextResponse } from 'ai';

export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const { messages, modelId } = await req.json();
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    const targetModel = modelId === 'viyana-fast' ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile';
    console.log(`[Viyana Web UI] Processing chat using Groq (${targetModel})`);

    const systemPrompt = `You are Viyana, a powerful AI business assistant.
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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: 'Groq API Error', details: err }), { status: response.status });
    }

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);

  } catch (error: any) {
    console.error(`[Viyana Web UI Error]`, error?.message || error);
    return new Response(JSON.stringify({ error: 'Processing Failed', details: error.message }), { status: 500 });
  }
}
