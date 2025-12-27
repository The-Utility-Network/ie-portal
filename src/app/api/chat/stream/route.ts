export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { OpenAI } from 'openai';

export async function POST(req: Request) {
  try {
    const { userInput } = await req.json().catch(() => ({ userInput: '' }));
    if (typeof userInput !== 'string') {
      return new Response('Invalid input', { status: 400 });
    }

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT as string;
    const apiKey = process.env.AZURE_OPENAI_API_KEY as string;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION as string;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT as string;

    if (!endpoint || !apiKey || !apiVersion || !deployment) {
      return new Response('Azure OpenAI env missing', { status: 500 });
    }

    const endpointUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;

    console.log('Azure Chat Config:', {
      endpoint: endpointUrl,
      deployment,
      apiVersion
    });

    const client = new OpenAI({
      apiKey,
      baseURL: `${endpointUrl}/openai/deployments/${deployment}`,
      defaultQuery: { 'api-version': apiVersion },
      defaultHeaders: { 'api-key': apiKey },
    });

    let completion: any;
    try {
      completion = await client.chat.completions.create({
        model: deployment,
        messages: [
          { role: 'system', content: 'You are Zynathra, a helpful assistant for Invisible Enemies.' },
          { role: 'user', content: String(userInput ?? '') },
        ],
        stream: true,
      });
    } catch (e: any) {
      const msg = e?.message || 'Azure request failed';
      return new Response(msg, { status: 500 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const part of completion) {
            const text = part.choices?.[0]?.delta?.content || '';
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch (err) {
          controller.error(err);
          return;
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    return new Response(err?.message || 'Server error', { status: 500 });
  }
}
