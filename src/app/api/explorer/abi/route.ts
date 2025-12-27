import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const address = searchParams.get('address');
		if (!address) {
			return NextResponse.json({ status: '0', message: 'NOTOK', result: 'Missing address' }, { status: 400 });
		}
		if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
			return NextResponse.json({ status: '0', message: 'NOTOK', result: 'Invalid address' }, { status: 400 });
		}
		const apiKey = process.env.EXPLORER_API_KEY || process.env.NEXT_PUBLIC_EXPLORER_API_KEY;
		const url = `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=getabi&address=${address}${apiKey ? `&apikey=${apiKey}` : ''}`;
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 15000);
		const resp = await fetch(url, { cache: 'no-store', signal: controller.signal, headers: { 'Accept': 'application/json' } });
		clearTimeout(timer);
		if (!resp.ok) {
			return NextResponse.json({ status: '0', message: 'NOTOK', result: `Upstream error: ${resp.status}` }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
		}
		const json = await resp.json();
		return NextResponse.json(json, { status: 200, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
	} catch (e: any) {
		const message = e?.name === 'AbortError' ? 'Upstream timeout' : (e?.message || 'Server error');
		const status = e?.name === 'AbortError' ? 504 : 500;
		return NextResponse.json({ status: '0', message: 'NOTOK', result: message }, { status, headers: { 'Cache-Control': 'no-store' } });
	}
}


