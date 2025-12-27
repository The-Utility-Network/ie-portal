export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  // Only expose non-sensitive values
  const config = {
    mintSoon: process.env.MINT_SOON === 'true',
    diamondAddress: process.env.DIAMOND_ADDRESS || null,
    hasExplorerKey: Boolean(process.env.EXPLORER_API_KEY || process.env.NEXT_PUBLIC_EXPLORER_API_KEY),
    directoryFacetName: process.env.DIRECTORY_FACET || process.env.NEXT_PUBLIC_DIRECTORY_FACET || null,
    directoryFacetAddress: process.env.DIRECTORY_FACET_ADDRESS || process.env.NEXT_PUBLIC_DIRECTORY_FACET_ADDRESS || null,
  };
  return NextResponse.json(config, { status: 200 });
}


