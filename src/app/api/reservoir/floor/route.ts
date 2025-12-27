export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const apiKey = process.env.RESERVOIR_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

    const url = `https://api.reservoir.tools/collections/v7?id=${address}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey,
      },
    });
    clearTimeout(timer);

    if (!resp.ok) {
      return NextResponse.json({ error: `Upstream error: ${resp.status}` }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
    const json = await resp.json();
    const collection = Array.isArray(json?.collections) && json.collections.length > 0 ? json.collections[0] : null;
    const price = collection?.floorAsk?.price || null;
    return NextResponse.json({ price }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    const message = e?.name === 'AbortError' ? 'Upstream timeout' : (e?.message || 'Failed');
    const status = e?.name === 'AbortError' ? 504 : 500;
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}


