import React, { useState, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import {
  getContract,
  readContract,
  prepareContractCall,
  sendAndConfirmTransaction,
  createThirdwebClient,
} from 'thirdweb';
import { useActiveWallet } from 'thirdweb/react';
import { base } from 'thirdweb/chains';
import { getDiamondAddress } from '../primitives/Diamond';

// Browser-safe Thirdweb client getter (fetches clientId from API)
let principlesClientCache: any | null = null;
async function getThirdwebBrowserClient() {
  if (principlesClientCache) return principlesClientCache;
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT;
  if (!clientId) throw new Error('Thirdweb client is not configured');
  principlesClientCache = createThirdwebClient({ clientId });
  return principlesClientCache;
}

// Replace with your actual contract address
let contractAddressPromise: Promise<string> | null = null;
const getContractAddress = async () => {
  if (!contractAddressPromise) contractAddressPromise = getDiamondAddress();
  return contractAddressPromise;
};

// Contract ABI
const abi: any = [
  // Paste the provided ABI here
  { "inputs": [], "name": "EnumerableSet__IndexOutOfBounds", "type": "error" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "string", "name": "name", "type": "string" }, { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }], "name": "PrinciplesAccepted", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "string", "name": "oldName", "type": "string" }, { "indexed": false, "internalType": "string", "name": "newName", "type": "string" }], "name": "SignerNameUpdated", "type": "event" },
  { "inputs": [{ "internalType": "string", "name": "name", "type": "string" }], "name": "acceptPrinciples", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "getAcceptanceSignature", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "pure", "type": "function" },
  { "inputs": [], "name": "getAllPrinciples", "outputs": [{ "components": [{ "internalType": "string", "name": "japaneseName", "type": "string" }, { "internalType": "string", "name": "englishName", "type": "string" }, { "internalType": "string", "name": "description", "type": "string" }], "internalType": "struct TUCOperatingPrinciples.Principle[]", "name": "", "type": "tuple[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getAllSigners", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }], "name": "getPrinciple", "outputs": [{ "internalType": "string", "name": "", "type": "string" }, { "internalType": "string", "name": "", "type": "string" }, { "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getPrincipleCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getSignerCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "signer", "type": "address" }], "name": "getSignerDetails", "outputs": [{ "internalType": "string", "name": "name", "type": "string" }, { "internalType": "uint256", "name": "timestamp", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "hasPrinciplesAccepted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "initializePrinciples", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "isPrinciplesInitialized", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "signer", "type": "address" }, { "internalType": "string", "name": "newName", "type": "string" }], "name": "updateSignerName", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

// Define a set of unique colors for expanded accordions
const principleColors = [
  'rgba(255, 99, 132, 0.2)',   // Light Red
  'rgba(54, 162, 235, 0.2)',   // Light Blue
  'rgba(255, 206, 86, 0.2)',   // Light Yellow
  'rgba(75, 192, 192, 0.2)',   // Light Teal
  'rgba(153, 102, 255, 0.2)',  // Light Purple
  'rgba(255, 159, 64, 0.2)',   // Light Orange
  'rgba(199, 199, 199, 0.2)',  // Light Gray
  'rgba(255, 205, 86, 0.2)',   // Another Light Yellow
];

const OperatingPrinciples = () => {
  const [principles, setPrinciples] = useState<any[]>([]);
  const [signerCount, setSignerCount] = useState<number>(0);
  const [hasAccepted, setHasAccepted] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedIndex, setExpandedIndex] = useState<number | false>(false);

  const wallet = useActiveWallet()?.getAccount() as any;

  useEffect(() => {
    fetchPrinciples();
    fetchSignerCount();
    if (wallet) {
      checkIfUserHasAccepted();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  const fetchPrinciples = async () => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getContractAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const result = await readContract({
        contract,
        method: 'getAllPrinciples',
        params: [],
      });

      setPrinciples(result);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching principles:', error);
    }
  };

  const fetchSignerCount = async () => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getContractAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const count = await readContract({
        contract,
        method: 'getSignerCount',
        params: [],
      });

      setSignerCount(Number(count));
    } catch (error) {
      console.error('Error fetching signer count:', error);
    }
  };

  const checkIfUserHasAccepted = async () => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getContractAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const accepted = await readContract({
        contract,
        method: 'hasPrinciplesAccepted',
        params: [wallet.address],
      });

      setHasAccepted(accepted);
    } catch (error) {
      console.error('Error checking acceptance:', error);
    }
  };

  const handleAcceptPrinciples = async () => {
    if (!userName.trim()) {
      alert('Please enter your name before signing.');
      return;
    }

    try {
      const client = await getThirdwebBrowserClient();
      const address = await getContractAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const transaction = prepareContractCall({
        contract,
        method: 'acceptPrinciples',
        params: [userName],
        value: BigInt(0),
      });

      await sendAndConfirmTransaction({
        transaction,
        account: wallet!,
      });

      setHasAccepted(true);
      fetchSignerCount();
    } catch (error) {
      console.error('Error accepting principles:', error);
    }
  };

  if (loading) {
    return <div className="text-white text-xl text-center mt-20 font-bold animate-pulse">Loading Operating Principles...</div>;
  }

  return (
    <div
      className="flex flex-col items-center overflow-y-auto backdrop-blur-md bg-[#805080]/85 rounded-[40px] p-4 md:p-8 mt-36 md:mt-10 max-h-[75vh] md:max-h-screen text-white scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
    >
      <h3 className="text-3xl md:text-5xl font-bold mb-2 text-center drop-shadow-lg">
        Invisible Enemies Operating Principles
      </h3>
      <h6 className="text-lg md:text-xl mb-8 text-center opacity-90 font-mono">
        Total Signers: {signerCount}
      </h6>

      <div className="w-full max-w-[800px] flex flex-col gap-2">
        {principles.map((principle: { japaneseName: any; englishName: any; description: any; }, index: number) => {
          const isExpanded = expandedIndex === index;
          const bgColor = isExpanded ? principleColors[index % principleColors.length] : 'rgba(255, 255, 255, 0.08)';

          return (
            <div
              key={index}
              className={`rounded-xl border border-white/20 shadow-lg overflow-hidden transition-all duration-300 backdrop-blur-sm ${isExpanded ? 'bg-opacity-50' : 'hover:bg-white/10'}`}
              style={{ backgroundColor: bgColor }}
            >
              <button
                onClick={() => setExpandedIndex(isExpanded ? false : index)}
                className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
              >
                <div className="flex flex-col">
                  <h6 className="text-lg md:text-xl font-medium drop-shadow-md">
                    {principle.japaneseName} - {principle.englishName}
                  </h6>
                </div>
                <ChevronDownIcon
                  className={`w-6 h-6 text-white transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="p-4 pt-2 border-t border-white/10 bg-black/10 text-gray-100 leading-relaxed text-base md:text-lg rounded-b-xl">
                  {principle.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 md:p-10 w-full max-w-[600px] text-center shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
        {!hasAccepted ? (
          <div className="flex flex-col items-center">
            <h4 className="text-2xl md:text-4xl font-bold mb-4 drop-shadow-md">
              Uphold Our Values
            </h4>
            <p className="mb-4 text-gray-200 leading-relaxed text-sm md:text-base">
              By signing, you commit to embodying and upholding our operating principles. Your dedication ensures that we maintain excellence, integrity, and a harmonious work environment.
            </p>
            <p className="mb-6 text-gray-200 font-medium">
              Please enter your name below to signify your acceptance and commitment.
            </p>
            <input
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full max-w-[400px] bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-xl px-5 py-3 text-base outline-none focus:border-[#F54029] focus:bg-white/30 transition-all mb-6 placeholder-white/50 text-center font-bold shadow-inner"
            />
            <button
              onClick={handleAcceptPrinciples}
              className="bg-[#F54029] hover:bg-[#D03824] text-white rounded-full px-8 py-3 text-lg font-bold min-w-[200px] transition-all transform hover:scale-105 shadow-xl hover:shadow-[#F54029]/40"
            >
              Sign Principles
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <h4 className="text-2xl md:text-4xl font-bold mb-4 text-green-400 drop-shadow-md">
              Thank You for Signing!
            </h4>
            <p className="text-gray-100 leading-relaxed text-lg">
              Your commitment to our operating principles strengthens our company&apos;s foundation and fosters a culture of excellence and integrity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperatingPrinciples;
