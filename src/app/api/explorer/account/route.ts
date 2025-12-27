export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    const action = searchParams.get('action'); // balance | txlist | txlistinternal
    const sort = searchParams.get('sort'); // asc | desc (optional)

    if (!address) {
      return NextResponse.json({ status: '0', message: 'NOTOK', result: 'Missing address' }, { status: 400 });
    }
    // Basic address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ status: '0', message: 'NOTOK', result: 'Invalid address' }, { status: 400 });
    }
    if (!action) {
      return NextResponse.json({ status: '0', message: 'NOTOK', result: 'Missing action' }, { status: 400 });
    }
    // Whitelist supported actions
    const allowedActions = new Set(['balance', 'txlist', 'txlistinternal']);
    if (!allowedActions.has(action)) {
      return NextResponse.json({ status: '0', message: 'NOTOK', result: 'Unsupported action' }, { status: 400 });
    }

    const apiKey = process.env.EXPLORER_API_KEY || process.env.NEXT_PUBLIC_EXPLORER_API_KEY || '';
    const base = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=${encodeURIComponent(action)}&address=${encodeURIComponent(address)}`;
    const withSort = sort ? `${base}&sort=${encodeURIComponent(sort)}` : base;
    const url = apiKey ? `${withSort}&apikey=${apiKey}` : withSort;

    // Timeout-safe fetch
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(url, { cache: 'no-store', signal: controller.signal, headers: { 'Accept': 'application/json' } });
    clearTimeout(timer);
    if (!resp.ok) {
      return NextResponse.json({ status: '0', message: 'NOTOK', result: `Upstream error: ${resp.status}` }, { status: 502, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
    }
    const json = await resp.json();
    return NextResponse.json(json, { status: 200, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
  } catch (e: any) {
    const message = e?.name === 'AbortError' ? 'Upstream timeout' : (e?.message || 'Server error');
    const status = e?.name === 'AbortError' ? 504 : 500;
    return NextResponse.json({ status: '0', message: 'NOTOK', result: message }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
}


