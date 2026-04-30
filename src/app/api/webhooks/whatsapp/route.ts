import { google } from '@ai-sdk/google';
import { generateText, ModelMessage } from 'ai';
import { getSystemPrompt } from '@/lib/ai/system-prompts';
import { Redis } from '@upstash/redis';

// Initialize Redis only if URLs are provided (graceful fallback)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'viyana_secret_wa_token';

  if (mode === 'subscribe' && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Check if it's a valid WhatsApp message
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (messages && messages.length > 0) {
      const message = messages[0];
      const fromNumber = message.from; // Sender's phone number
      const messageId = message.id;
      const messageType = message.type; // text, image, audio, document, etc.
      
      let userMessageContent = '';

      if (messageType === 'text') {
        userMessageContent = message.text?.body || '';
      } else if (messageType === 'image') {
        userMessageContent = '[User sent an Image. Currently, I can only acknowledge media messages. Please ask the user to describe the image or provide context.]';
      } else if (messageType === 'audio') {
        userMessageContent = '[User sent an Audio/Voice note. Currently, I cannot listen to audio. Please politely ask them to type their message.]';
      } else if (messageType === 'document') {
        userMessageContent = '[User sent a Document. Please acknowledge that you cannot read documents directly and ask for a text summary.]';
      } else {
        userMessageContent = `[User sent a message of type: ${messageType}. Acknowledge it if necessary.]`;
      }

      if (userMessageContent) {
        // 1. Fetch conversation history from Redis
        const historyKey = `whatsapp_chat:${fromNumber}`;
        let chatHistory: ModelMessage[] = [];
        
        if (redis) {
          const storedHistory = await redis.get<ModelMessage[]>(historyKey);
          if (storedHistory && Array.isArray(storedHistory)) {
            chatHistory = storedHistory;
          }
        }

        // Add the new user message
        chatHistory.push({ role: 'user', content: userMessageContent });

        // Keep only the last 20 messages to avoid exceeding context limits
        if (chatHistory.length > 20) {
          chatHistory = chatHistory.slice(chatHistory.length - 20);
        }

        // 2. Generate response using Gemma 4 (WhatsApp Manager Persona)
        const systemPrompt = getSystemPrompt('whatsapp_manager');
        
        const { text: aiResponse } = await generateText({
          model: google('gemma-4-31b-it'),
          system: systemPrompt,
          messages: chatHistory,
        });

        // 3. Save assistant response back to history
        chatHistory.push({ role: 'assistant', content: aiResponse });
        
        if (redis) {
          // Store history with a 7-day expiration (604800 seconds)
          await redis.set(historyKey, chatHistory, { ex: 604800 });
        }

        // 4. Send the message back via WhatsApp Cloud API
        const phoneId = process.env.WHATSAPP_PHONE_ID;
        const waToken = process.env.WHATSAPP_TOKEN;

        if (phoneId && waToken) {
          const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${waToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: fromNumber,
              type: 'text',
              text: { body: aiResponse },
            }),
          });
          
          if (!response.ok) {
            const errBody = await response.text();
            console.error('WhatsApp API Error:', errBody);
          }
        } else {
          console.warn('WhatsApp API credentials not configured. Response drafted:', aiResponse);
        }
      }
    }

    return new Response('EVENT_RECEIVED', { status: 200 });
  } catch (error: any) {
    console.error('Error in WhatsApp Webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
