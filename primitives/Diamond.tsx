import { getContract, readContract, createThirdwebClient } from "thirdweb";
import { base } from "thirdweb/chains";

export async function getDiamondAddress(): Promise<string> {
  // Client-side optimization: Check for public env var first
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_MINT_CONTRACT) {
    return process.env.NEXT_PUBLIC_MINT_CONTRACT;
  }

  if (typeof window === 'undefined') {
    const address = process.env.DIAMOND_ADDRESS || process.env.NEXT_PUBLIC_MINT_CONTRACT;
    if (!address) {
      throw new Error("DIAMOND_ADDRESS environment variable is not set.");
    }
    return address;
  }

  try {
    const resp = await fetch('/api/config', { cache: 'no-store' });
    if (!resp.ok) throw new Error('Config fetch failed');
    const json = await resp.json();
    if (!json?.diamondAddress) throw new Error('Diamond address not configured');
    return json.diamondAddress as string;
  } catch (e) {
    // Last resort fallback if fetch fails (e.g. network error)
    if (process.env.NEXT_PUBLIC_MINT_CONTRACT) {
      return process.env.NEXT_PUBLIC_MINT_CONTRACT;
    }
    throw e;
  }
}

async function getDynamicContract() {
  let client: any;
  if (typeof window === 'undefined') {
    const secretKey = process.env.THIRDWEB_SECRET_KEY;
    if (secretKey) {
      client = createThirdwebClient({ secretKey });
    } else {
      const clientId = process.env.THIRDWEB_CLIENT_ID || process.env.NEXT_PUBLIC_THIRDWEB_CLIENT;
      if (!clientId) throw new Error('Thirdweb server credentials not configured');
      client = createThirdwebClient({ clientId });
    }
  } else {
    const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT;
    if (!clientId) throw new Error('Thirdweb client is not configured');
    client = createThirdwebClient({ clientId });
  }
  const address = await getDiamondAddress();
  // Minimal ABI for loupe calls
  const loupeAbi = [
    {
      type: 'function',
      name: 'facets',
      stateMutability: 'view',
      inputs: [],
      outputs: [
        {
          type: 'tuple[]',
          components: [
            { name: 'target', type: 'address' },
            { name: 'selectors', type: 'bytes4[]' },
          ],
        },
      ],
    },
    {
      type: 'function',
      name: 'facetFunctionSelectors',
      stateMutability: 'view',
      inputs: [{ name: 'facet', type: 'address' }],
      outputs: [{ type: 'bytes4[]' }],
    },
  ] as const;
  return getContract({ client, chain: base, address, abi: loupeAbi as any });
}

// Function to get all facets and their selectors
type RawFacet = { target: `0x${string}`; selectors: readonly `0x${string}`[] };
async function getFacets(): Promise<RawFacet[]> {
  try {
    // Call the 'facets' method on the contract using minimal loupe ABI
    const contract = await getDynamicContract();
    const facetsResponse = await readContract({
      contract,
      method: "facets",
      params: [],
    } as any);
    console.log(facetsResponse);

    return facetsResponse as RawFacet[];
  } catch (error) {
    console.error("Error fetching facets:", error);
    return [] as RawFacet[];
  }
}

// Function to get details for a specific method (function selector) in a facet
async function getMethodDetails(facetAddress: `0x${string}`, selector: `0x${string}`) {
  try {
    // Call the 'facetFunctionSelectors' method to get the function selectors for a given facet address
    const contract = await getDynamicContract();
    const selectors = await readContract({
      contract,
      method: "facetFunctionSelectors",
      params: [facetAddress],
    } as any);
    console.log(selectors)

    // Find and return the selector details (if applicable)
    const methodDetails = selectors.find((sel: any) => sel === selector);
    return methodDetails ? methodDetails : null;
  } catch (error) {
    console.error("Error fetching method details:", error);
    return null;
  }
}

export { getFacets };
export { getMethodDetails };
// no contract export to avoid server env leak into client bundle