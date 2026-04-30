import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { getSystemPrompt } from '@/lib/ai/system-prompts';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN || 'viyana_secret_ig_token';

  if (mode === 'subscribe' && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.object === 'instagram') {
      const entry = body.entry?.[0];
      const messaging = entry?.messaging?.[0];

      if (messaging && messaging.message) {
        const senderId = messaging.sender?.id;
        const messageText = messaging.message?.text;

        if (senderId && messageText) {
          // 1. Generate response using Gemma 4
          const systemPrompt = getSystemPrompt('sales');

          const { text: aiResponse } = await generateText({
            model: google('gemma-4-31b-it'),
            system: systemPrompt,
            prompt: messageText,
          });

          // 2. Send DM via Instagram Graph API
          const pageToken = process.env.INSTAGRAM_PAGE_TOKEN;

          if (pageToken) {
            await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${pageToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                recipient: { id: senderId },
                messaging_type: 'RESPONSE',
                message: { text: aiResponse },
              }),
            });
          } else {
            console.warn('Instagram API credentials not configured. Response drafted:', aiResponse);
          }
        }
      }
    }

    return new Response('EVENT_RECEIVED', { status: 200 });
  } catch (error: any) {
    console.error('Error in Instagram Webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
