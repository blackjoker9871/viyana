import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { getSystemPrompt } from '@/lib/ai/system-prompts';

export async function GET(req: Request) {
  try {
    // Optional: Secure route via Authorization Bearer token matching CRON_SECRET
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 1. Compile simulated briefing prompt
    const systemPrompt = getSystemPrompt('secretary');
    const prompt = `
      Create a highly professional and welcoming daily briefing for the Aethel Solutions executive team.
      Include:
      1. A brief motivational boost.
      2. 3 actionable tasks/priorities for a generic tech/digital agency day.
      3. A gentle reminder to verify unanswered incoming customer inquiries.
    `;

    // 2. Query Gemma 4
    const { text: briefing } = await generateText({
      model: google('gemma-4-31b-it'),
      system: systemPrompt,
      prompt,
    });

    // 3. (Optional) Dispatch briefing to user via WhatsApp
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const waToken = process.env.WHATSAPP_TOKEN;
    const targetNumber = process.env.ADMIN_PHONE_NUMBER; // User's personal number

    if (phoneId && waToken && targetNumber) {
      await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: targetNumber,
          type: 'text',
          text: { body: briefing },
        }),
      });
      console.log('Daily briefing dispatched via WhatsApp successfully.');
    }

    return new Response(JSON.stringify({ 
      status: 'success', 
      message: 'Viyana alert check completed.', 
      briefing 
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('Error in Viyana Cron Alert:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
