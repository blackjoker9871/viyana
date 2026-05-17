import { NextResponse } from 'next/server';
import axios from 'axios';

export const maxDuration = 60; 

async function callGroq(prompt: string, systemPrompt: string, apiKey: string) {
  const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]
  }, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  return res.data.choices[0].message.content;
}

export async function POST(req: Request) {
  try {
    const { message, remoteJid, senderName, isGroup } = await req.json();
    
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    console.log(`[Viyana WhatsApp] Processing message from ${senderName} (${remoteJid}) using Groq (Llama 3.3 70B)`);

    const systemPrompt = `You are Viyana, a powerful AI business assistant communicating via WhatsApp. 
      Keep your responses concise, helpful, and professional.
      
      User Info:
      - Name: ${senderName}
      - Context: ${isGroup ? 'Group Chat (Viyana Admin Group)' : 'Private Chat (Customer)'}
      
      If the user is in the Viyana Admin Group, you can be more technical and provide deeper business insights.
      If the user is a Customer, focus on helpfulness and lead conversion.`;

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    const replyText = await callGroq(message, systemPrompt, GROQ_API_KEY);

    return NextResponse.json({ reply: replyText });

  } catch (error: any) {
    console.error(`[Viyana WhatsApp Error]`, error?.response?.data || error.message);
    return NextResponse.json({ error: 'Failed to generate response', details: error.message }, { status: 500 });
  }
}
