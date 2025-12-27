"use client";
// Reserve.tsx

import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  WalletIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  PaperAirplaneIcon,
  TrashIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { TransactionButton, useActiveAccount, useActiveWallet, CheckoutWidget } from 'thirdweb/react';
import { getContract as getTwContract, prepareContractCall as prepareTwCall, prepareTransaction } from 'thirdweb';
import {
  getContract,
  readContract,
  prepareContractCall,
  sendAndConfirmTransaction,
} from 'thirdweb';
import { base } from 'thirdweb/chains';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ethers, formatEther, parseEther, parseUnits } from 'ethers';
import { getDiamondAddress } from '../primitives/Diamond';
import { createThirdwebClient } from 'thirdweb';
import { ReserveABI as abi } from '../primitives/TSPABI';

// Initialize the client in-browser from server-provided clientId
// Initialize the client in-browser from server-provided clientId
const clientPromise = Promise.resolve(
  process.env.NEXT_PUBLIC_THIRDWEB_CLIENT
    ? createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT })
    : null
);

// Contract Address
let contractAddressPromise: Promise<string> | null = null;
const getContractAddress = async () => {
  if (!contractAddressPromise) contractAddressPromise = getDiamondAddress();
  const addr = await contractAddressPromise;
  if (!addr || addr === '') {
    // Retry once if empty
    contractAddressPromise = getDiamondAddress();
    return await contractAddressPromise;
  }
  return addr;
};

// Role Definition
const CHIEF_OF_POLICE_ROLE = 'Commander';

const COLORS = ['#7f2cff', '#9d5cff', '#bd8cff', '#e0bfff', '#f0e0ff', '#ffffff', '#2c0052', '#4a008f'];
// Token display symbols
const TOKEN_SYMBOLS = { ETH: 'Ξ', USDC: 'USDC', CBBTC: '₿' } as const;

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const { timestamp, balance, percentageChange } = data;

    return (
      <div className="bg-black/90 border border-white/20 p-3 rounded-lg shadow-xl text-xs">
        <p className="font-bold text-white mb-1">{timestamp}</p>
        <p className="text-white/80">Balance: {balance} ETH</p>
        {typeof percentageChange === 'number' && (
          <p className={percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}>
            Change: {Number(percentageChange).toFixed(2)}%
          </p>
        )}
      </div>
    );
  }

  return null;
};

// Generic Modal Component
const Modal = ({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-In">
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <XMarkIcon className="w-5 h-5 text-white/70" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Reserve Component
const Reserve = () => {
  // State variables
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [lastTransactions, setLastTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(true);
  const [isChief, setIsChief] = useState<boolean>(false);

  // Modals state
  const [openAddBeneficiary, setOpenAddBeneficiary] = useState<boolean>(false);
  const [newBeneficiary, setNewBeneficiary] = useState<{ address: string; split: number; role: string }>({
    address: '',
    split: 0,
    role: '',
  });
  const [openUpdateBeneficiary, setOpenUpdateBeneficiary] = useState<boolean>(false);
  const [currentBeneficiary, setCurrentBeneficiary] = useState<{
    index: number;
    address: string;
    split: number;
    role: string;
  }>({ index: 0, address: '', split: 0, role: '' });

  // State variables for write functions
  const [openWriteFunctionDialog, setOpenWriteFunctionDialog] = useState<boolean>(false);
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionInputs, setFunctionInputs] = useState<any>({});

  // State variable for balance history
  const [balanceHistory, setBalanceHistory] = useState<any[]>([]);
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [cbbtcBalance, setCbbtcBalance] = useState<string>('0');
  const [usdcBalanceNum, setUsdcBalanceNum] = useState<number>(0);
  const [cbbtcBalanceNum, setCbbtcBalanceNum] = useState<number>(0);
  const [pricesUSD, setPricesUSD] = useState<{ eth: number; usdc: number; cbbtc: number }>({ eth: 0, usdc: 1, cbbtc: 0 });
  const [ethBalanceNum, setEthBalanceNum] = useState<number>(0);

  // Active Account
  const address = useActiveAccount()?.address;
  const wallet = useActiveWallet()?.getAccount();

  // Effect Hook
  useEffect(() => {
    (async () => {
      const client = await clientPromise;
      if (!client) return;
      // reads independent of wallet
      await fetchAllData();
      await fetchTransactionData();
      // writes/role require wallet
      if (wallet && address) {
        await checkIfChief();
      } else {
        setIsChief(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  // Fetch USD prices (ETH, USDC, BTC) and refresh periodically
  useEffect(() => {
    let timer: any;
    const load = async () => {
      try {
        const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin,bitcoin&vs_currencies=usd', { cache: 'no-store' });
        const j = await resp.json();
        setPricesUSD({
          eth: Number(j?.ethereum?.usd || 0),
          usdc: Number(j?.['usd-coin']?.usd || 1),
          cbbtc: Number(j?.bitcoin?.usd || 0),
        });
      } catch { }
    };
    load();
    timer = setInterval(load, 1000 * 60 * 5);
    return () => timer && clearInterval(timer);
  }, []);

  // Fetch Beneficiaries
  const fetchAllData = async () => {
    try {
      console.log("Reserve: Starting fetchAllData...");
      const address = await getContractAddress();
      console.log("Reserve: Resolved Address:", address);

      const contract = getContract({
        client: await clientPromise as any,
        chain: base,
        address: address as string,
        abi: abi,
      });

      console.log("Reserve: Calling getBeneficiaries...");
      // Fetch Beneficiaries
      const beneficiariesData = await readContract({
        contract,
        method: 'getBeneficiaries',
        params: [],
      });
      console.log("Reserve: Beneficiaries Data:", beneficiariesData);
      setBeneficiaries(beneficiariesData as any[]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching contract data:', error);
      setLoading(false);
    }
  };

  // Check if User is Chief
  const checkIfChief = async () => {
    try {
      const contractAddr = await getContractAddress();
      const contract = getContract({
        client: await clientPromise as any,
        chain: base,
        address: contractAddr as string,
        abi: abi,
      });

      const hasRole = await readContract({
        contract,
        method: 'ieHasRole',
        params: [CHIEF_OF_POLICE_ROLE, address as string],
      });

      setIsChief(hasRole as boolean);
    } catch (error) {
      console.error('Error checking role:', error);
    }
  };

  // Fetch Transactions (External and Internal)
  const fetchTransactionData = async () => {
    try {
      const contractAddr = await getContractAddress();
      const externalResp = await fetch(`/api/explorer/account?action=txlist&address=${contractAddr}&sort=asc`, { cache: 'no-store' });
      const externalData = await externalResp.json();

      if (externalData.status !== '1') {
        console.error('Error fetching external transactions:', externalData.message);
        return;
      }

      // Combine both transaction lists - simplified to just external for now as per original code
      const combinedTransactions = [...externalData.result];

      // Sort transactions by timestamp in ascending order
      combinedTransactions.sort((a: any, b: any) => Number(a.timeStamp) - Number(b.timeStamp));

      const txCount = combinedTransactions.length;
      setTransactionCount(txCount);

      const lastTransactions = combinedTransactions.slice(-4).reverse();
      setLastTransactions(lastTransactions);

      // Process transactions to calculate ETH balance history
      const ethHistory = await processBalanceHistory(combinedTransactions);

      // Token histories (USDC, cbBTC)
      const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      const CBBTC_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
      const tokenHistoryBuilder = async (tokenAddress: string) => {
        try {
          const resp = await fetch(`/api/explorer/account?action=tokentx&address=${contractAddr}&contractaddress=${tokenAddress}&sort=asc`, { cache: 'no-store' });
          const json = await resp.json();
          if (json?.status !== '1' || !Array.isArray(json?.result)) return [] as any[];
          let decimals = 18;
          try {
            const client = await clientPromise as any;
            const erc20Abi = [
              { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
            ];
            const erc20 = getContract({ client, chain: base, address: tokenAddress, abi: erc20Abi as any });
            const d = await (readContract as any)({ contract: erc20, method: 'decimals' });
            decimals = Number(d || 18);
          } catch { }
          let running = 0n;
          const points: any[] = [];
          const sorted = json.result.sort((a: any, b: any) => Number(a.timeStamp) - Number(b.timeStamp));
          for (const tx of sorted) {
            const value = BigInt(tx.value || '0');
            const ts = Number(tx.timeStamp) * 1000;
            const from = String(tx.from || '').toLowerCase();
            const to = String(tx.to || '').toLowerCase();
            if (to === String(contractAddr).toLowerCase()) running += value;
            else if (from === String(contractAddr).toLowerCase()) running -= value;
            const num = Number(running) / Math.pow(10, decimals);
            points.push({ timestamp: new Date(ts).toLocaleDateString(), value: num });
          }
          return points;
        } catch { return [] as any[]; }
      };

      const [usdcHist, cbbtcHist] = await Promise.all([
        tokenHistoryBuilder(USDC_ADDRESS),
        tokenHistoryBuilder(CBBTC_ADDRESS),
      ]);

      const unify = () => {
        const map = new Map<string, { timestamp: string; eth?: number; usdc?: number; cbbtc?: number }>();
        let lastEth = 0, lastUsdc = 0, lastCbbtc = 0;
        for (const p of ethHistory) {
          const key = p.timestamp as string;
          const ref = map.get(key) || { timestamp: key };
          ref.eth = p.balance;
          map.set(key, ref);
        }
        for (const p of usdcHist) {
          const key = p.timestamp as string;
          const ref = map.get(key) || { timestamp: key };
          ref.usdc = p.value;
          map.set(key, ref);
        }
        for (const p of cbbtcHist) {
          const key = p.timestamp as string;
          const ref = map.get(key) || { timestamp: key };
          ref.cbbtc = p.value;
          map.set(key, ref);
        }
        const arr = Array.from(map.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return arr.map((row) => {
          if (typeof row.eth === 'number') lastEth = row.eth;
          if (typeof row.usdc === 'number') lastUsdc = row.usdc;
          if (typeof row.cbbtc === 'number') lastCbbtc = row.cbbtc;
          return { timestamp: row.timestamp, balance: lastEth, usdc: lastUsdc, cbbtc: lastCbbtc };
        });
      };

      setBalanceHistory(unify());

      // Live token balances via ERC20 balanceOf
      try {
        const client = await clientPromise as any;
        const erc20Abi = [
          { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
          { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
        ];
        const usdc = getContract({ client, chain: base, address: USDC_ADDRESS, abi: erc20Abi as any });
        const cbbtc = getContract({ client, chain: base, address: CBBTC_ADDRESS, abi: erc20Abi as any });
        const [usdcBalRaw, usdcDec, cbbtcBalRaw, cbbtcDec] = await Promise.all([
          (readContract as any)({ contract: usdc, method: 'balanceOf', params: [contractAddr] }),
          (readContract as any)({ contract: usdc, method: 'decimals' }),
          (readContract as any)({ contract: cbbtc, method: 'balanceOf', params: [contractAddr] }),
          (readContract as any)({ contract: cbbtc, method: 'decimals' }),
        ]);
        const usdcBal = Number(usdcBalRaw) / Math.pow(10, Number(usdcDec || 6));
        const cbbtcBal = Number(cbbtcBalRaw) / Math.pow(10, Number(cbbtcDec || 8));
        setUsdcBalanceNum(usdcBal);
        setCbbtcBalanceNum(cbbtcBal);
        setUsdcBalance(usdcBal.toLocaleString(undefined, { maximumFractionDigits: 4 }));
        setCbbtcBalance(cbbtcBal.toLocaleString(undefined, { maximumFractionDigits: 6 }));
      } catch { }
    } catch (error) {
      console.error('Error fetching transaction data:', error);
    }
  };

  const manualRefresh = async () => {
    setLoading(true);
    await fetchAllData();
    await fetchTransactionData();
    setLoading(false);
  };

  // Process Balance History
  const processBalanceHistory = async (transactions: any[]) => {
    try {
      // Initialize balance at zero
      let balance = 0n; // BigInt starting at 0

      const balanceHistoryData: any[] = [];

      // Ensure transactions are sorted in ascending order
      const sortedTransactions = transactions.sort(
        (a, b) => Number(a.timeStamp) - Number(b.timeStamp)
      );

      const contractAddressLower = (await getContractAddress())?.toLowerCase();

      let previousBalance = 0n; // To store the previous balance for percentage change

      sortedTransactions.forEach((txn) => {
        const value = BigInt(txn.value || '0'); // Transaction value in wei
        const timestamp = Number(txn.timeStamp) * 1000; // Convert to milliseconds

        const txnToLower = (txn.to || '').toLowerCase();
        const txnFromLower = (txn.from || '').toLowerCase();

        if (txnToLower === contractAddressLower) {
          // Incoming transaction (Deposit)
          balance += value;
        } else if (txnFromLower === contractAddressLower) {
          // Outgoing transaction (Withdrawal)
          balance -= value;

          // Prevent balance from going negative
          if (balance < 0n) {
            balance = 0n;
          }
        }

        // Calculate percentage change
        let percentageChange: number | null = null;
        if (previousBalance !== 0n) {
          percentageChange =
            Number(balance - previousBalance) / Number(previousBalance) * 100;
        }

        balanceHistoryData.push({
          timestamp: new Date(timestamp).toLocaleDateString(),
          balance: Number(formatEther(balance.toString())), // Convert balance to Ether format
          percentageChange, // Percentage change from previous balance
        });

        // Update previous balance
        previousBalance = balance;
      });

      // Update the displayed balance to match the calculated balance
      const ethNum = Number(formatEther(balance.toString()));
      setBalance(ethNum.toLocaleString(undefined, { maximumFractionDigits: 4 }));
      setEthBalanceNum(ethNum);
      return balanceHistoryData;
    } catch (error) {
      console.error('Error processing balance history:', error);
      return [] as any[];
    }
  };

  // Handle Add Beneficiary
  const handleAddBeneficiary = async () => {
    if (!newBeneficiary.address || newBeneficiary.split <= 0 || !newBeneficiary.role) {
      alert('Please fill all fields correctly.');
      return;
    }

    try {
      if (!wallet) {
        alert('Wallet not connected.');
        return;
      }

      const address = await getContractAddress();
      const contract = getContract({
        client: await clientPromise as any,
        chain: base,
        address: address as string,
        abi: abi,
      });

      const tx = await prepareContractCall({
        contract,
        method: 'addBeneficiary',
        params: [newBeneficiary.address, BigInt(newBeneficiary.split), newBeneficiary.role],
      });

      await sendAndConfirmTransaction({
        transaction: tx,
        account: wallet,
      });

      alert('Beneficiary added successfully!');
      setOpenAddBeneficiary(false);
      setNewBeneficiary({ address: '', split: 0, role: '' });
      fetchAllData();
      fetchTransactionData(); // Refresh transactions
    } catch (error) {
      console.error('Error adding beneficiary:', error);
      alert('Failed to add beneficiary.');
    }
  };

  // Handle Update Beneficiary
  const handleUpdateBeneficiary = async () => {
    if (!currentBeneficiary.address || currentBeneficiary.split <= 0 || !currentBeneficiary.role) {
      alert('Please fill all fields correctly.');
      return;
    }

    try {
      if (!wallet) {
        alert('Wallet not connected.');
        return;
      }

      const address = await getContractAddress();
      const contract = getContract({
        client: await clientPromise as any,
        chain: base,
        address: address as string,
        abi: abi,
      });

      const tx = await prepareContractCall({
        contract,
        method: 'updateBeneficiary',
        params: [currentBeneficiary.address, BigInt(currentBeneficiary.split), currentBeneficiary.role],
      });

      await sendAndConfirmTransaction({
        transaction: tx,
        account: wallet,
      });

      alert('Beneficiary updated successfully!');
      setOpenUpdateBeneficiary(false);
      setCurrentBeneficiary({ index: 0, address: '', split: 0, role: '' });
      fetchAllData();
      fetchTransactionData();
    } catch (error) {
      console.error('Error updating beneficiary:', error);
      alert('Failed to update beneficiary.');
    }
  };

  // Handle Remove Beneficiary
  const handleRemoveBeneficiary = async (index: number) => {
    if (!window.confirm('Are you sure you want to remove this beneficiary?')) return;

    try {
      if (!wallet) {
        alert('Wallet not connected.');
        return;
      }

      const address = await getContractAddress();
      const contract = getContract({
        client: await clientPromise as any,
        chain: base,
        address: address as string,
        abi: abi,
      });

      const tx = await prepareContractCall({
        contract,
        method: 'removeBeneficiaryByIndex',
        params: [BigInt(index)],
      });

      await sendAndConfirmTransaction({
        transaction: tx,
        account: wallet,
      });

      alert('Beneficiary removed successfully!');
      fetchAllData();
      fetchTransactionData();
    } catch (error) {
      console.error('Error removing beneficiary:', error);
      alert('Failed to remove beneficiary.');
    }
  };

  // Handle Write Functions
  const handleWriteFunction = async () => {
    try {
      if (!wallet) {
        alert('Wallet not connected.');
        return;
      }

      const contract = getContract({
        client: await clientPromise as any,
        chain: base,
        address: await getContractAddress() as string,
        abi: abi,
      });

      let tx;

      switch (selectedFunction) {
        case 'depositFunds':
          if (!functionInputs.amount || !functionInputs.note) {
            alert('Please provide both amount and note.');
            return;
          }
          tx = await prepareContractCall({
            contract,
            method: 'depositFunds',
            params: [functionInputs.note],
            value: parseEther(functionInputs.amount),
          });
          break;
        case 'withdraw':
          tx = await prepareContractCall({
            contract,
            method: 'withdraw',
            params: [],
          });
          break;
        case 'sendFundsToUtilityCoDiamond':
          if (!functionInputs.percentage || !functionInputs.note) {
            alert('Please provide both percentage and note.');
            return;
          }
          tx = await prepareContractCall({
            contract,
            method: 'sendFundsToUtilityCoDiamond',
            params: [BigInt(functionInputs.percentage), functionInputs.note],
          });
          break;
        case 'wipeBeneficiaries':
          tx = await prepareContractCall({
            contract,
            method: 'wipeBeneficiaries',
            params: [],
          });
          break;
        default:
          alert('Function not implemented.');
          return;
      }

      await sendAndConfirmTransaction({
        transaction: tx,
        account: wallet,
      });

      alert(`${selectedFunction} executed successfully!`);
      setOpenWriteFunctionDialog(false);
      setFunctionInputs({});
      fetchAllData();
      fetchTransactionData();
    } catch (error) {
      console.error(`Error executing ${selectedFunction}:`, error);
      alert(`Failed to execute ${selectedFunction}.`);
    }
  };

  // Render Beneficiaries Chart
  const renderBeneficiariesChart = () => {
    if (!beneficiaries || beneficiaries.length === 0) return null;

    const data = beneficiaries.map((b: any) => ({
      name: b.role,
      value: Number(b.split),
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
          <Legend wrapperStyle={{ color: '#fff' }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white font-mono animate-pulse">
        LOADING RESERVE DATA...
      </div>
    );
  }

  return (
    <div className="min-h-[96vh] p-4 md:p-8 text-white overflow-y-auto font-sans relative">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-600 via-purple-400 to-purple-600 opacity-70"></div>

      <div className="max-w-7xl mx-auto space-y-8 mt-4 pb-20">
        {/* Title Section */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-purple-950/70 backdrop-blur-xl p-6 rounded-2xl border border-purple-400/40 shadow-[0_0_30px_rgba(127,44,255,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-white">
              Reserve Dashboard
            </h1>
            <p className="text-purple-300/50 text-sm font-mono tracking-widest">
              INVISIBLE ENEMIES FUND
            </p>
          </div>
          <button onClick={manualRefresh} className="p-2 hover:bg-purple-500/20 rounded-full transition-colors" title="Refresh Data">
            <ArrowPathIcon className={`w-6 h-6 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isChief && (
            <div className="flex gap-2 mt-4 md:mt-0">
              <button
                onClick={() => { setSelectedFunction('depositFunds'); setOpenWriteFunctionDialog(true); }}
                className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 rounded-full px-4 py-2 transition-all"
              >
                <WalletIcon className="w-4 h-4" /> Deposit
              </button>
              <button
                onClick={() => { setSelectedFunction('withdraw'); setOpenWriteFunctionDialog(true); }}
                className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-full px-4 py-2 transition-all"
              >
                <BanknotesIcon className="w-4 h-4" /> Withdraw
              </button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ETH Balance */}
          <div className="bg-purple-950/60 backdrop-blur-xl border border-purple-400/30 p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group shadow-[0_0_25px_rgba(127,44,255,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent group-hover:from-purple-400/20 transition-all duration-300"></div>
            <h2 className="text-purple-200/70 font-mono text-sm relative z-10 tracking-wider">ETH RESERVE</h2>
            <p className="text-4xl font-bold mt-2 relative z-10 text-white drop-shadow-[0_0_10px_rgba(127,44,255,0.3)]">{balance} Ξ</p>
            <p className="text-purple-200/50 text-xs mt-1 relative z-10">
              ${(ethBalanceNum * pricesUSD.eth).toLocaleString()}
            </p>
          </div>

          {/* USDC Balance */}
          <div className="bg-purple-950/60 backdrop-blur-xl border border-purple-400/30 p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group shadow-[0_0_25px_rgba(127,44,255,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent group-hover:from-purple-400/20 transition-all duration-300"></div>
            <h2 className="text-purple-200/70 font-mono text-sm relative z-10 tracking-wider">USDC RESERVE</h2>
            <p className="text-4xl font-bold mt-2 relative z-10 text-white drop-shadow-[0_0_10px_rgba(127,44,255,0.3)]">{usdcBalance}</p>
            <p className="text-purple-200/50 text-xs mt-1 relative z-10">
              ${(usdcBalanceNum * pricesUSD.usdc).toLocaleString()}
            </p>
          </div>

          {/* cbBTC Balance */}
          <div className="bg-purple-950/60 backdrop-blur-xl border border-purple-400/30 p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group shadow-[0_0_25px_rgba(127,44,255,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent group-hover:from-purple-400/20 transition-all duration-300"></div>
            <h2 className="text-purple-200/70 font-mono text-sm relative z-10 tracking-wider">BTC RESERVE</h2>
            <p className="text-4xl font-bold mt-2 relative z-10 text-white drop-shadow-[0_0_10px_rgba(127,44,255,0.3)]">{cbbtcBalance}</p>
            <p className="text-purple-200/50 text-xs mt-1 relative z-10">
              ${(cbbtcBalanceNum * pricesUSD.cbbtc).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Balance History */}
          <div className="bg-purple-950/60 backdrop-blur-xl border border-purple-400/30 rounded-2xl p-6 min-h-[400px] shadow-[0_0_25px_rgba(127,44,255,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-2 mb-6">
              <ChartBarIcon className="w-5 h-5 text-purple-300" />
              <h3 className="text-lg font-bold text-white">Reserves History</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,44,255,0.1)" />
                  <XAxis dataKey="timestamp" stroke="#7f2cff" fontSize={12} tickFormatter={(t) => t.split('/')[0] + '/' + t.split('/')[1]} />
                  <YAxis stroke="#7f2cff" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: '#fff' }} />
                  <Line type="monotone" dataKey="balance" stroke="#fff" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="ETH" />
                  <Line type="monotone" dataKey="usdc" stroke="#a78bfa" strokeWidth={2} dot={false} name="USDC" />
                  <Line type="monotone" dataKey="cbbtc" stroke="#c084fc" strokeWidth={2} dot={false} name="BTC" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Beneficiaries Pie */}
          <div className="bg-purple-950/60 backdrop-blur-xl border border-purple-400/30 rounded-2xl p-6 min-h-[400px] shadow-[0_0_25px_rgba(127,44,255,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-2 mb-6">
              <ChartBarIcon className="w-5 h-5 text-purple-300" />
              <h3 className="text-lg font-bold text-white">Allocation Distribution</h3>
            </div>
            <div className="h-[300px] flex items-center justify-center">
              {renderBeneficiariesChart()}
            </div>
          </div>
        </div>

        {/* Beneficiaries List */}
        <div className="bg-purple-950/60 backdrop-blur-xl border border-purple-400/30 rounded-2xl p-6 overflow-hidden shadow-[0_0_25px_rgba(127,44,255,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Authorized Beneficiaries</h3>
            {isChief && (
              <button
                onClick={() => setOpenAddBeneficiary(true)}
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/50 text-sm font-mono">
                  <th className="p-3">ROLE</th>
                  <th className="p-3">ADDRESS</th>
                  <th className="p-3 text-right">SPLIT</th>
                  {isChief && <th className="p-3 text-right">ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {beneficiaries.map((b, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3 text-white font-medium">{b.role}</td>
                    <td className="p-3 text-gray-400 font-mono text-sm">{b.beneficiaryAddress}</td>
                    <td className="p-3 text-right text-green-400">{Number(b.split)}%</td>
                    {isChief && (
                      <td className="p-3 text-right flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setCurrentBeneficiary({ index: i, address: b.beneficiaryAddress, split: Number(b.split), role: b.role });
                            setOpenUpdateBeneficiary(true);
                          }}
                          className="p-1 hover:text-blue-400 text-gray-400 transition-colors"
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveBeneficiary(i)}
                          className="p-1 hover:text-red-400 text-gray-400 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {beneficiaries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500 italic">No beneficiaries found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Beneficiary Modal */}
      <Modal open={openAddBeneficiary} onClose={() => setOpenAddBeneficiary(false)} title="Add Beneficiary">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-gray-500 mb-1">WALLET ADDRESS</label>
            <input
              type="text"
              value={newBeneficiary.address}
              onChange={(e) => setNewBeneficiary({ ...newBeneficiary, address: e.target.value })}
              className="w-full bg-black border border-white/10 rounded p-2 text-white focus:border-blue-500 outline-none transition-colors"
              placeholder="0x..."
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-mono text-gray-500 mb-1">SPLIT %</label>
              <input
                type="number"
                value={newBeneficiary.split}
                onChange={(e) => setNewBeneficiary({ ...newBeneficiary, split: Number(e.target.value) })}
                className="w-full bg-black border border-white/10 rounded p-2 text-white focus:border-blue-500 outline-none transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-mono text-gray-500 mb-1">ROLE</label>
              <input
                type="text"
                value={newBeneficiary.role}
                onChange={(e) => setNewBeneficiary({ ...newBeneficiary, role: e.target.value })}
                className="w-full bg-black border border-white/10 rounded p-2 text-white focus:border-blue-500 outline-none transition-colors"
                placeholder="e.g. Developer"
              />
            </div>
          </div>
          <button
            onClick={handleAddBeneficiary}
            className="w-full bg-white text-black font-bold py-3 rounded hover:bg-gray-200 transition-colors mt-2"
          >
            Confirm Add
          </button>
        </div>
      </Modal>

      {/* Update Beneficiary Modal */}
      <Modal open={openUpdateBeneficiary} onClose={() => setOpenUpdateBeneficiary(false)} title="Update Beneficiary">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-gray-500 mb-1">WALLET ADDRESS</label>
            <input
              type="text"
              value={currentBeneficiary.address}
              disabled
              className="w-full bg-black/50 border border-white/5 rounded p-2 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-mono text-gray-500 mb-1">SPLIT %</label>
              <input
                type="number"
                value={currentBeneficiary.split}
                onChange={(e) => setCurrentBeneficiary({ ...currentBeneficiary, split: Number(e.target.value) })}
                className="w-full bg-black border border-white/10 rounded p-2 text-white focus:border-blue-500 outline-none transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-mono text-gray-500 mb-1">ROLE</label>
              <input
                type="text"
                value={currentBeneficiary.role}
                onChange={(e) => setCurrentBeneficiary({ ...currentBeneficiary, role: e.target.value })}
                className="w-full bg-black border border-white/10 rounded p-2 text-white focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>
          <button
            onClick={handleUpdateBeneficiary}
            className="w-full bg-white text-black font-bold py-3 rounded hover:bg-gray-200 transition-colors mt-2"
          >
            Confirm Update
          </button>
        </div>
      </Modal>

      {/* Write Function Modal */}
      <Modal open={openWriteFunctionDialog} onClose={() => setOpenWriteFunctionDialog(false)} title={selectedFunction.replace(/([A-Z])/g, ' $1').trim()}>
        <div className="space-y-4">
          {(selectedFunction === 'depositFunds' || selectedFunction === 'sendFundsToUtilityCoDiamond') && (
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1">
                {selectedFunction === 'sendFundsToUtilityCoDiamond' ? 'PERCENTAGE' : 'AMOUNT (ETH)'}
              </label>
              <input
                type="number"
                onChange={(e) => setFunctionInputs({ ...functionInputs, [selectedFunction === 'sendFundsToUtilityCoDiamond' ? 'percentage' : 'amount']: e.target.value })}
                className="w-full bg-black border border-white/10 rounded p-2 text-white focus:border-blue-500 outline-none transition-colors"
                placeholder="0"
              />
            </div>
          )}
          {(selectedFunction === 'depositFunds' || selectedFunction === 'sendFundsToUtilityCoDiamond') && (
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1">NOTE</label>
              <input
                type="text"
                onChange={(e) => setFunctionInputs({ ...functionInputs, note: e.target.value })}
                className="w-full bg-black border border-white/10 rounded p-2 text-white focus:border-blue-500 outline-none transition-colors"
                placeholder="Description..."
              />
            </div>
          )}
          {selectedFunction === 'withdraw' && (
            <p className="text-sm text-gray-400">
              Confirm withdrawal of funds?
            </p>
          )}
          <button
            onClick={handleWriteFunction}
            className="w-full bg-white text-black font-bold py-3 rounded hover:bg-gray-200 transition-colors mt-2"
          >
            Execute Transaction
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Reserve;
