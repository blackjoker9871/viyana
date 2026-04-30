import { google } from '@ai-sdk/google';
import { streamText, convertToModelMessages, UIMessage } from 'ai';
import { getSystemPrompt } from '@/lib/ai/system-prompts';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, role }: { messages: UIMessage[]; role?: string } = await req.json();
    
    // Default to sales role if not specified
    const activeRole = (role || 'sales') as 'sales' | 'secretary' | 'factchecker';
    const systemPrompt = getSystemPrompt(activeRole);

    // Convert UI messages to model-compatible format (required in AI SDK v6)
    const modelMessages = await convertToModelMessages(messages);

    // Using Gemma 4 via Google Generative AI API
    const result = streamText({
      model: google('gemma-4-31b-it'),
      messages: modelMessages,
      system: systemPrompt,
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('Error in Viyana AI Chat API:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred during text generation' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
