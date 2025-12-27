export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  // If secret key exists, do not leak it. We still need to return something for client components that expect a clientId.
  const hasSecret = Boolean(process.env.THIRDWEB_SECRET_KEY);
  const clientId = process.env.THIRDWEB_CLIENT_ID || process.env.NEXT_PUBLIC_THIRDWEB_CLIENT || null;
  if (!hasSecret && !clientId) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  return NextResponse.json({ clientId: clientId || null, hasSecret }, { status: 200 });
}


