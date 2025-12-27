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

    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

    // Alchemy NFT v3 owners endpoint
    const baseV3 = 'https://base-mainnet.g.alchemy.com/nft/v3';
    const urlV3 = `${baseV3}/${apiKey}/getOwnersForContract?contractAddress=${address}&withTokenBalances=false`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(urlV3, { cache: 'no-store', signal: controller.signal, headers: { 'Accept': 'application/json' } });
    clearTimeout(timer);

    if (!resp.ok) {
      return NextResponse.json({ error: `Upstream error: ${resp.status}` }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
    const data = await resp.json();

    const owners = Array.isArray(data?.ownerAddresses)
      ? data.ownerAddresses
      : Array.isArray(data?.owners)
        ? data.owners
        : [];

    return NextResponse.json(owners, { status: 200, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (e: any) {
    const message = e?.name === 'AbortError' ? 'Upstream timeout' : (e?.message || 'Failed');
    const status = e?.name === 'AbortError' ? 504 : 500;
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}


