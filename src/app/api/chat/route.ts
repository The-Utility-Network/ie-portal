import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export async function POST(req: Request) {
  try {
    const { userInput } = await req.json().catch(() => ({ userInput: '' }));
    if (typeof userInput !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT as string;
    const apiKey = process.env.AZURE_OPENAI_API_KEY as string;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION as string;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT as string;

    if (!endpoint || !apiKey || !apiVersion || !deployment) {
      return NextResponse.json({ error: 'Azure OpenAI env missing' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: `${endpoint}/openai`,
      defaultQuery: { 'api-version': apiVersion },
      defaultHeaders: { 'api-key': apiKey },
    });

    // Azure Web App: set a request timeout via AbortController
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const completion = await openai.chat.completions.create({
      model: deployment,
      messages: [
        { role: 'system', content: 'You are Zynathra, a helpful assistant.' },
        { role: 'user', content: String(userInput ?? '') },
      ],
      temperature: 0.7,
      // @ts-ignore: openai supports this under the hood with fetch
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const text = completion.choices?.[0]?.message?.content || 'No response.';
    return NextResponse.json({ message: text });
  } catch (err: any) {
    const status = err?.name === 'AbortError' ? 504 : 500;
    const message = err?.name === 'AbortError' ? 'Upstream timeout' : (err?.message || 'Server error');
    return NextResponse.json({ error: message }, { status });
  }
}


