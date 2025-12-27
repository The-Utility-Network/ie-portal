import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import { AzureKeyCredential, TokenCredential } from "@azure/core-auth";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userInput } = await req.json().catch(() => ({ userInput: '' }));
    if (typeof userInput !== 'string') {
      return new Response('Invalid input', { status: 400 });
    }

    const endpoint = process.env.AZURE_AI_PROJECT_ENDPOINT || process.env.AZURE_OPENAI_PROJECT_ENDPOINT || process.env.AZURE_OPENAI_IMAGE_ENDPOINT; // fallback if user maps
    const agentId = process.env.AZURE_AGENT_ID || process.env.NEXT_PUBLIC_AZURE_AGENT_ID;

    if (!endpoint || !agentId) {
      return new Response('Agent endpoint or agent id missing (AZURE_AI_PROJECT_ENDPOINT, AZURE_AGENT_ID)', { status: 500 });
    }

    // Prefer API key if provided; otherwise fall back to Managed Identity / Default credentials
    const aiProjectApiKey = process.env.AZURE_AI_PROJECT_API_KEY;
    const credential: TokenCredential = aiProjectApiKey
      // Cast AzureKeyCredential to TokenCredential to satisfy TS – the SDK accepts either at runtime
      ? (new AzureKeyCredential(aiProjectApiKey) as unknown as TokenCredential)
      : new DefaultAzureCredential();

    const client = new AIProjectClient(
      endpoint,
      credential
    );

    // ensure agent exists
    await client.agents.getAgent(agentId);

    const thread = await client.agents.threads.create();
    await client.agents.messages.create(thread.id, 'user', String(userInput ?? ''));
    let run = await client.agents.runs.create(thread.id, agentId);

    // stream: poll and yield small heartbeat to keep connection alive
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          while (run.status === 'queued' || run.status === 'in_progress') {
            controller.enqueue(encoder.encode(''));
            await new Promise((r) => setTimeout(r, 1000));
            run = await client.agents.runs.get(thread.id, run.id);
          }

          if (run.status === 'failed') {
            controller.enqueue(encoder.encode(`\n[error] ${run.lastError?.message || 'Run failed'}`));
            controller.close();
            return;
          }

          const messages = client.agents.messages.list(thread.id, { order: 'asc' });
          let responseText = '';
          for await (const m of messages) {
            if (m.role !== 'assistant') continue;
            const items = (m as any).content as any[];
            for (const item of items) {
              // Azure SDK may return text content in different shapes; normalize safely
              const maybeValue = item?.text?.value ?? item?.text ?? item?.value;
              if (typeof maybeValue === 'string') {
                responseText += maybeValue;
              }
            }
          }
          if (!responseText) responseText = 'No response.';

          // send text in small word chunks to smooth the animation
          const parts = responseText.split(/(\s+)/);
          for (const part of parts) {
            controller.enqueue(encoder.encode(part));
            await new Promise((r) => setTimeout(r, 12));
          }
          controller.close();
        } catch (e: any) {
          controller.error(e);
        }
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


