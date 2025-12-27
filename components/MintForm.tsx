'use client'
import { ethers } from 'ethers';
import { useActiveAccount } from "thirdweb/react";
import { useState, useEffect, useRef, ChangeEvent } from "react";
import FiatMinting from "./fiatMintButton";
import { getContract, readContract, createThirdwebClient } from 'thirdweb';
import { base } from 'thirdweb/chains';
import { getDiamondAddress } from '../primitives/Diamond';
import { ChevronDownIcon, MinusIcon, PlusIcon, CurrencyDollarIcon, TicketIcon, UserGroupIcon, StarIcon, BanknotesIcon } from '@heroicons/react/24/outline';

// Minimal ABI bits we need for reads
const minimalAbi = [
  { inputs: [], name: 'totalSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ name: 'batchId', type: 'uint256' }], name: 'getBatchInfo', outputs: [
      { name: 'maxSupply', type: 'uint256' },
      { name: 'currentSupply', type: 'uint256' },
      { name: 'price', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ], stateMutability: 'view', type: 'function'
  },
];

export default function Form() {
  const activeAccount = useActiveAccount();
  const accountDisplay = activeAccount
    ? `${activeAccount.address.slice(0, 6)}...${activeAccount.address.slice(-4)}`
    : 'Not Connected';

  // State variables
  const [batch, setBatch] = useState<bigint | null>(null);
  const [tokens, setTokens] = useState<number>(1);
  const [pricePerToken, setPricePerToken] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string>('');
  const [whitelist, setWhitelist] = useState<boolean>(false);
  const [currentSupply, setCurrentSupply] = useState<number>(0);
  const [nfts, setNfts] = useState<any[]>([]);
  const [collectionDetails, setCollectionDetails] = useState<any>(null);
  const [batches, setBatches] = useState<BatchDetails[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(true);
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [serverConfig, setServerConfig] = useState<{ diamondAddress: string | null; mintSoon: boolean } | null>(null);

  // Ref for scrolling to the top
  const formRef = useRef<HTMLDivElement>(null);
  const tapSoundEffectRef = useRef<HTMLAudioElement | null>(null);

  // Fetch server-side config
  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch('/api/config', { cache: 'no-store' });
        const json = await resp.json();
        setServerConfig({ diamondAddress: json.diamondAddress, mintSoon: !!json.mintSoon });
      } catch (e) {
        console.warn('Config fetch failed, falling back to environment variables', e);
        const fallbackAddr = process.env.NEXT_PUBLIC_MINT_CONTRACT || null;
        setServerConfig({ diamondAddress: fallbackAddr, mintSoon: false });
      }
    };
    load();
  }, []);

  // Initialize tap sound effect
  useEffect(() => {
    try {
      tapSoundEffectRef.current = new Audio('/static/sounds/tap.mp3');
    } catch (error) {
      console.error('Error loading tap sound effect:', error);
    }
  }, []);

  // Fetch NFTs and collection details
  useEffect(() => {
    async function fetchNFTs() {
      try {
        if (!serverConfig?.diamondAddress) return;

        const addr = await getDiamondAddress();
        const nftResp = await fetch(`/api/alchemy/collection?address=${addr}`, { cache: 'no-store' });
        const nftResponse = await nftResp.json();

        // Transform Alchemy V3 data
        const list = Array.isArray(nftResponse?.nfts) ? nftResponse.nfts : [];
        const alchemyNfts = list.map((nft: any) => {
          const tokenId = nft?.tokenId ?? nft?.id?.tokenId;
          const name = nft?.name || nft?.title || `Token #${tokenId}`;
          const image = nft?.image?.originalUrl || nft?.image?.cachedUrl || nft?.image?.thumbnailUrl || nft?.media?.[0]?.gateway || nft?.image?.url;
          return {
            token: { tokenId, name, image }
          };
        });

        setNfts(alchemyNfts);

        // Collection metadata
        const mdResp = await fetch(`/api/alchemy/metadata?address=${addr}`, { cache: 'no-store' });
        const contractMetadata = await mdResp.json();

        // Owners
        let ownerCount: number | string = '—';
        try {
          const ownersResp = await fetch(`/api/alchemy/owners?address=${addr}`, { cache: 'no-store' });
          if (ownersResp.ok) {
            const ownersJson = await ownersResp.json();
            const ownersArr = Array.isArray(ownersJson) ? ownersJson : (ownersJson?.ownerAddresses || ownersJson?.owners || []);
            if (Array.isArray(ownersArr)) {
              const set = new Set<string>(ownersArr.map((x: any) => String(x).toLowerCase()));
              ownerCount = set.size;
            }
          }
        } catch { }

        // Floor price
        let floorEth: number | null = null;
        try {
          const alt = await fetch(`/api/alchemy/floor?address=${addr}`, { cache: 'no-store' });
          if (alt.ok) {
            const json = await alt.json();
            const val = Number(json?.floorPrice?.openSea?.floorPrice || json?.floor || json?.price?.eth);
            if (!Number.isNaN(val) && val > 0) floorEth = val;
          }
        } catch { }

        // IE Specific: 5346 max supply
        const fallbackSize = Number(process.env.NEXT_PUBLIC_COLLECTION_SIZE || 5346);
        const fallbackFloor = process.env.NEXT_PUBLIC_FLOOR_PRICE ? Number(process.env.NEXT_PUBLIC_FLOOR_PRICE) : null;

        setCollectionDetails({
          ownerCount,
          supply: contractMetadata?.contractMetadata?.totalSupply ?? fallbackSize,
          floorAsk: {
            price: {
              amount: { eth: floorEth ?? fallbackFloor },
            },
          },
          name: contractMetadata?.contractMetadata?.name || 'Invisible Enemies',
        });

      } catch (error: any) {
        console.error('Error fetching NFTs:', error);
        setError('Failed to load collection data.');
      }
    }

    if (serverConfig?.diamondAddress) fetchNFTs();
  }, [serverConfig?.diamondAddress]);


  // Define BatchDetails interface
  interface BatchDetails {
    id: number;
    maxSupply: number;
    currentSupply: number;
    price: number;
    isActive: boolean;
  }

  // Fetch batches
  useEffect(() => {
    async function fetchBatches() {
      try {
        let i = 1;
        const diamondAddress = await getDiamondAddress();
        if (!diamondAddress) throw new Error("Diamond address not found.");

        const twResp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
        const { clientId } = await twResp.json();
        if (!clientId) throw new Error('thirdweb client not configured');

        const client = createThirdwebClient({ clientId });
        const diamondContract = getContract({ client, chain: base, address: diamondAddress, abi: minimalAbi as any });
        let batchArr: any = await (readContract as any)({ contract: diamondContract, method: 'getBatchInfo', params: [BigInt(i)] });
        const batchDetailsArray: BatchDetails[] = [];

        while (batchArr && Number(batchArr[0] || 0) !== 0) {
          batchDetailsArray.push({
            id: i,
            maxSupply: Number(batchArr[0] || 0),
            currentSupply: Number(batchArr[1] || 0),
            price: Number(batchArr[2] || 0),
            isActive: Boolean(batchArr[3]),
          });
          i++;
          const nextArr: any = await (readContract as any)({ contract: diamondContract, method: 'getBatchInfo', params: [BigInt(i)] });
          if (Number(nextArr?.[0] || 0) === 0) break;
          batchArr = nextArr;
        }

        setBatches(batchDetailsArray);

        const firstActiveBatch = batchDetailsArray.find(batch => batch.isActive && batch.currentSupply < batch.maxSupply);
        if (firstActiveBatch) {
          setBatch(BigInt(firstActiveBatch.id));
        }
      } catch (error) {
        console.error('Error fetching batches:', error);
        setError('Failed to load batches.');
      } finally {
        setIsLoadingBatches(false);
      }
    }

    fetchBatches();
  }, []);

  // Fetch current supply
  useEffect(() => {
    let isMounted = true;
    async function fetchCurrentSupply() {
      try {
        const diamondAddress = await getDiamondAddress();
        if (!diamondAddress) return;
        const twResp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
        const { clientId } = await twResp.json();
        if (!clientId) return;

        const client = createThirdwebClient({ clientId });
        const diamondContract = getContract({ client, chain: base, address: diamondAddress, abi: minimalAbi as any });
        const totalSupply = await (readContract as any)({ contract: diamondContract, method: 'totalSupply' });
        if (isMounted) setCurrentSupply(parseInt((totalSupply as any).toString(), 10));
      } catch (error) {
        if (isMounted) console.error("Error getting current supply:", error);
      }
    }
    fetchCurrentSupply();
    return () => { isMounted = false; };
  }, []);

  // Fetch price per token
  useEffect(() => {
    async function fetchPricePerToken() {
      if (batch === null) return;
      setIsLoadingPrice(true);
      try {
        const diamondAddress = await getDiamondAddress();
        const twResp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
        const { clientId } = await twResp.json();
        const client = createThirdwebClient({ clientId });
        const diamondContract = getContract({ client, chain: base, address: diamondAddress, abi: minimalAbi as any });
        const details: any = await (readContract as any)({ contract: diamondContract, method: 'getBatchInfo', params: [batch] });
        if (details) {
          setPricePerToken(Number(details[2] || 0));
        }
      } catch (error) {
        console.error("Error fetching price:", error);
        setPricePerToken(0);
      } finally {
        setIsLoadingPrice(false);
      }
    }

    if (batch !== null) fetchPricePerToken();
  }, [batch]);

  const playTap = () => {
    if (tapSoundEffectRef.current) {
      tapSoundEffectRef.current.currentTime = 0;
      tapSoundEffectRef.current.play().catch(() => { });
    }
  };

  const incrementTokens = () => {
    playTap();
    setTokens(prev => prev + 1);
  };

  const decrementTokens = () => {
    playTap();
    setTokens(prev => Math.max(1, prev - 1));
  };

  const getImageUrl = (url: string): string => {
    if (!url) return '/fallback-image.png';
    if (url.startsWith('ipfs://')) return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
    return url;
  };

  return (
    <div className="flex flex-col h-full font-[family-name:var(--font-rajdhani)] text-white overflow-hidden">
      <style jsx>{`
        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
      `}</style>

      {/* Main Glass Container */}
      <div
        ref={formRef}
        className="flex flex-col h-full rounded-2xl border border-purple-400/30 bg-purple-950/60 backdrop-blur-xl shadow-[0_0_30px_rgba(127,44,255,0.2)] relative overflow-hidden"
      >
        {/* Header Section */}
        <div className="p-6 border-b border-purple-400/20 bg-purple-900/30 flex flex-col gap-4">
          {/* Top Row: Title & Connections */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold tracking-widest text-white uppercase flex items-center gap-2">
                <BanknotesIcon className="w-6 h-6 text-purple-400" />
                MINT<span className="text-purple-400">{'//'}</span>TERMINAL
              </h2>
              <span className="text-[10px] text-purple-300/50 uppercase tracking-[0.2em] font-bold pl-1">Secure Transaction Layer</span>
            </div>
            <div className="flex flex-col items-end">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${activeAccount ? 'bg-purple-500/20 border-purple-400/40 text-white' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${activeAccount ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold tracking-wider uppercase">{activeAccount ? 'CONNECTED' : 'DISCONNECTED'}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <div className="bg-purple-900/40 backdrop-blur-sm border border-purple-400/20 rounded-lg p-3 flex flex-col items-center justify-center text-center hover:bg-purple-800/40 transition-colors">
              <UserGroupIcon className="w-4 h-4 text-purple-300/60 mb-1" />
              <span className="text-xs font-bold text-white">{collectionDetails?.ownerCount || '--'}</span>
              <span className="text-[9px] text-purple-300/40 uppercase tracking-widest">Holders</span>
            </div>
            <div className="bg-purple-900/40 backdrop-blur-sm border border-purple-400/20 rounded-lg p-3 flex flex-col items-center justify-center text-center hover:bg-purple-800/40 transition-colors">
              <TicketIcon className="w-4 h-4 text-purple-300/60 mb-1" />
              <span className="text-xs font-bold text-white">{currentSupply} / {collectionDetails?.supply || '5346'}</span>
              <span className="text-[9px] text-purple-300/40 uppercase tracking-widest">Minted</span>
            </div>
            <div className="bg-purple-900/40 backdrop-blur-sm border border-purple-400/20 rounded-lg p-3 flex flex-col items-center justify-center text-center hover:bg-purple-800/40 transition-colors">
              <CurrencyDollarIcon className="w-4 h-4 text-purple-300/60 mb-1" />
              <span className="text-xs font-bold text-white">{collectionDetails?.floorAsk?.price?.amount?.eth ? `${collectionDetails.floorAsk.price.amount.eth} ETH` : '--'}</span>
              <span className="text-[9px] text-purple-300/40 uppercase tracking-widest">Floor</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 relative">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none fixed" />

          {error && (
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 text-red-200 p-3 rounded-lg text-xs text-center font-bold tracking-wide uppercase">
              {error}
            </div>
          )}

          {/* NFT Gallery - Restored Grayscale to Color Effect */}
          {nfts.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {nfts.slice(0, 8).map((nft, idx) => (
                <div key={nft.token.tokenId || idx} className="aspect-square relative group overflow-hidden rounded-lg border border-purple-400/20 bg-purple-900/30">
                  <img
                    src={getImageUrl(nft.token.image)}
                    alt={nft.token.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                    <span className="text-[9px] font-bold text-white truncate w-full font-mono">{nft.token.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Batches Status */}
          <div className="space-y-2">
            <div className="flex justify-between items-end px-1">
              <span className="text-[10px] text-purple-300/60 uppercase tracking-widest font-bold">Batch Progress</span>
              <span className="text-[10px] text-purple-300/50 font-mono">{batches.filter(b => b.isActive).length} Active Zones</span>
            </div>
            <div className="flex gap-1 h-3 w-full bg-purple-900/40 backdrop-blur-sm rounded-full p-1 border border-purple-400/20">
              {batches.map((batchItem) => (
                <div
                  key={batchItem.id}
                  className={`flex-1 rounded-full transition-all duration-500 ${batchItem.isActive && batchItem.currentSupply < batchItem.maxSupply
                    ? 'bg-purple-400 shadow-[0_0_10px_rgba(127,44,255,0.7)]'
                    : batchItem.currentSupply >= batchItem.maxSupply
                      ? 'bg-purple-500/30'
                      : 'bg-purple-500/10'
                    }`}
                  title={`Batch ${batchItem.id}`}
                />
              ))}
            </div>
          </div>

          {/* Controls Section */}
          <div className="bg-purple-900/40 backdrop-blur-md border border-purple-400/20 rounded-xl p-4 space-y-4 shadow-lg">

            {/* Batch Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-purple-300/60 uppercase tracking-widest font-bold ml-1">Select Batch Tier</label>
              <div className="relative group">
                <select
                  value={batch !== null ? batch.toString() : ''}
                  onChange={(e) => { playTap(); setBatch(BigInt(e.target.value)); }}
                  disabled={isLoadingBatches}
                  className="w-full bg-purple-950/60 border border-purple-400/30 rounded-lg pl-4 pr-10 py-3 text-white appearance-none focus:outline-none focus:ring-1 focus:ring-purple-400/50 transition-all hover:bg-purple-900/60 text-sm font-bold font-mono"
                >
                  <option value="" disabled>-- SELECT BATCH --</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id} disabled={!b.isActive || b.currentSupply >= b.maxSupply}>
                      BATCH {b.id.toString().padStart(2, '0')} :: {b.currentSupply >= b.maxSupply ? '[SOLD OUT]' : b.isActive ? '[ACTIVE]' : '[LOCKED]'}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300/50 pointer-events-none group-hover:text-purple-300 transition-colors" />
              </div>
            </div>

            {/* Quantity & Price Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-purple-300/60 uppercase tracking-widest font-bold ml-1">Quantity</label>
                <div className="flex items-center bg-purple-950/60 border border-purple-400/30 rounded-lg p-1 group hover:border-purple-400/50 transition-colors">
                  <button onClick={decrementTokens} className="p-2 hover:bg-purple-500/20 rounded text-purple-300/50 hover:text-white transition-colors"><MinusIcon className="w-4 h-4" /></button>
                  <input
                    type="number"
                    value={tokens}
                    onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 20) setTokens(v); }}
                    className="flex-1 bg-transparent text-center text-white font-mono font-bold focus:outline-none"
                  />
                  <button onClick={incrementTokens} className="p-2 hover:bg-purple-500/20 rounded text-purple-300/50 hover:text-white transition-colors"><PlusIcon className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-purple-300/60 uppercase tracking-widest font-bold ml-1">Total (ETH)</label>
                <div className="w-full bg-purple-950/80 border border-purple-400/30 rounded-lg px-4 py-3 flex items-center justify-end text-sm font-mono font-bold text-white shadow-inner">
                  {isLoadingPrice ? '...' : pricePerToken > 0 ? Number(ethers.formatEther(BigInt(tokens * pricePerToken))).toFixed(4) : '0.000'}
                </div>
              </div>
            </div>

            {/* Whitelist Toggle */}
            <label className="flex items-center gap-3 p-3 bg-purple-950/50 border border-purple-400/20 rounded-lg cursor-pointer hover:bg-purple-900/50 transition-colors group select-none">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${whitelist ? 'bg-purple-500 border-purple-400' : 'border-purple-400/40 bg-purple-950/60'}`}>
                {whitelist && <StarIcon className="w-3 h-3 text-white" />}
              </div>
              <input type="checkbox" checked={whitelist} onChange={(e) => { playTap(); setWhitelist(e.target.checked); }} className="hidden" />
              <span className="text-xs font-bold text-purple-200/70 group-hover:text-white uppercase tracking-wider">Enable Whitelist Access</span>
            </label>
          </div>

          {/* Action Button Area */}
          <div className="pt-2">
            <FiatMinting
              Batch={batch !== null ? Number(batch) : 0}
              tokens={tokens}
              whitelist={whitelist}
              referral={referralCode}
              batchPrice={pricePerToken}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
