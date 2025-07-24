// app/airtime/page.tsx
"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {Button} from "@/components/ui/button"
import {Label} from "@/components/ui/label"
import {Badge} from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import BackToDashboard from "@/components/BackToDashboard"
import AuthGuard from "@/components/AuthGuard"
import { Input } from "@/components/ui/input"

import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { ERC20_ABI } from "@/config/erc20Abi";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSimulateContract } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { parseEther, parseUnits, toBytes, toHex, Hex, formatUnits } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";
import { useBaseNetworkEnforcer } from '@/hooks/useBaseNetworkEnforcer';

import { buyAirtime } from "@/lib/api";

// Base chain contract addresses (ensure these are correct for Base Mainnet)
const USDT_CONTRACT_ADDRESS = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
const USDC_CONTRACT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Backend API URL - Update this to your actual backend URL
// const BACKEND_API_URL = "https://wagmicharge-backend.onrender.com";

const CRYPTOS = [
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", tokenType: 0, decimals: 18, contract: undefined },
  { symbol: "USDT", name: "Tether", coingeckoId: "tether", tokenType: 1, decimals: 6, contract: USDT_CONTRACT_ADDRESS },
  { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", tokenType: 2, decimals: 6, contract: USDC_CONTRACT_ADDRESS },
]

const NETWORKS = [
  { serviceID: "mtn", name: "MTN" },
  { serviceID: "glo", name: "Glo" },
  { serviceID: "airtel", name: "Airtel" },
  { serviceID: "9mobile", name: "9mobile" },
]

function generateRequestId() {
  return `${Date.now().toString()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

async function fetchPrices() {
  try {
    const ids = CRYPTOS.map(c => c.coingeckoId).join(",")
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`)
    return res.ok ? await res.json() : {}
  } catch (error) {
    console.error("Error fetching prices:", error);
    return {};
  }
}

export default function AirtimePage() {
  const [crypto, setCrypto] = useState("")
  const [network, setNetwork] = useState("")
  const [amount, setAmount] = useState("")
  const [phone, setPhone] = useState("")
  const [prices, setPrices] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [requestId, setRequestId] = useState<string | undefined>(undefined);

  const [txStatus, setTxStatus] = useState<'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' | 'backendProcessing' | 'backendSuccess' | 'backendError' | 'waitingForApprovalSignature' | 'approving' | 'approvalSuccess' | 'approvalError'>('idle');
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const backendRequestSentRef = useRef<Hex | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);

  const { connectWallet, authenticated, user } = usePrivy();
  const { isConnected, address } = useAccount();
  const { isOnBaseChain, isSwitchingChain, promptSwitchToBase } = useBaseNetworkEnforcer();

  /* initial load */
  useEffect(() => {
    fetchPrices().then(setPrices).finally(() => setLoading(false))
  }, [])

  /* requestId generator */
  useEffect(() => {
    if ((crypto || network || amount || phone) && !requestId) {
      setRequestId(generateRequestId());
    } else if (!(crypto || network || amount || phone) && requestId) {
      setRequestId(undefined);
    }
  }, [crypto, network, amount, phone, requestId]);

  /* derived values */
  const selectedCrypto = CRYPTOS.find(c => c.symbol === crypto)
  const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
  const amountNGN = Number(amount) || 0
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0

  // Enhanced token amount calculation with better precision
  const getTokenAmountForOrder = useCallback((): bigint => {
    if (!selectedCrypto || cryptoNeeded <= 0) return BigInt(0);
    
    try {
      // For very small amounts, use more precision
      const precision = selectedCrypto.decimals;
      
      // Convert to string with sufficient decimal places
      let amountStr: string;
      
      if (selectedCrypto.symbol === 'ETH') {
        // ETH needs 18 decimals precision
        amountStr = cryptoNeeded.toFixed(18);
      } else {
        // USDT/USDC typically need 6 decimals but add buffer for precision
        const extraPrecision = Math.max(precision, 8);
        amountStr = cryptoNeeded.toFixed(extraPrecision);
      }
      
      // Remove trailing zeros and parse
      amountStr = parseFloat(amountStr).toString();
      
      return parseUnits(amountStr, precision);
    } catch (error) {
      console.error('Error calculating token amount:', error, {
        cryptoNeeded,
        selectedCrypto: selectedCrypto.symbol,
        decimals: selectedCrypto.decimals
      });
      return BigInt(0);
    }
  }, [selectedCrypto, cryptoNeeded]);

  const tokenAmountForOrder = getTokenAmountForOrder();
  
  const valueForEth = selectedCrypto?.symbol === 'ETH' && cryptoNeeded > 0
    ? parseEther(cryptoNeeded.toFixed(18))
    : BigInt(0);
  
  const bytes32RequestId: Hex = requestId ? toHex(toBytes(requestId), { size: 32 }) : toHex(toBytes(""), { size: 32 });

  // Check current allowance for ERC20 tokens
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: selectedCrypto?.contract as Hex,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as Hex, CONTRACT_ADDRESS],
    query: {
      enabled: Boolean(selectedCrypto?.contract && address && selectedCrypto.tokenType !== 0),
    },
  });

  // Check if approval is needed
  useEffect(() => {
    if (selectedCrypto?.tokenType === 0 || !currentAllowance || !tokenAmountForOrder) {
      setNeedsApproval(false);
      return;
    }

    const allowanceBigInt = currentAllowance as bigint;
    const needsApprovalCheck = allowanceBigInt < tokenAmountForOrder;
    setNeedsApproval(needsApprovalCheck);
    
    console.log("Approval check:", {
      currentAllowance: allowanceBigInt.toString(),
      tokenAmountNeeded: tokenAmountForOrder.toString(),
      needsApproval: needsApprovalCheck
    });
  }, [currentAllowance, tokenAmountForOrder, selectedCrypto]);

  // Wagmi Hooks for TOKEN APPROVAL Transaction
  const { 
    writeContract: writeApprove, 
    data: approveHash, 
    isPending: isApprovePending, 
    isError: isApproveError, 
    error: approveWriteError,
    reset: resetApprove 
  } = useWriteContract();

  const { 
    isLoading: isApprovalConfirming, 
    isSuccess: isApprovalTxConfirmed, 
    isError: isApprovalConfirmError, 
    error: approveConfirmError 
  } = useWaitForTransactionReceipt({
    hash: approveHash as Hex,
    query: {
      enabled: Boolean(approveHash),
      refetchInterval: 1000,
    },
  });

  // Wagmi Hooks for MAIN PAYMENT Transaction
  const { 
    writeContract, 
    data: hash, 
    isPending: isWritePending, 
    isError: isWriteError, 
    error: writeError,
    reset: resetWrite 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed, 
    isError: isConfirmError, 
    error: confirmError 
  } = useWaitForTransactionReceipt({
    hash: hash as Hex,
    query: {
      enabled: Boolean(hash),
      refetchInterval: 1000,
    },
  });

  // Check if requestId is already used
  const { data: existingOrder } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getOrder',
    args: [bytes32RequestId],
    query: { enabled: Boolean(requestId && address) },
  });

  // Simulate main contract transaction
  const { data: mainSimulation, error: mainSimError } = useSimulateContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'createOrder',
    args: [bytes32RequestId, selectedCrypto?.tokenType ?? 0, tokenAmountForOrder],
    value: selectedCrypto?.tokenType === 0 ? valueForEth : 0n,
    query: { enabled: Boolean(requestId && address && tokenAmountForOrder > 0n) },
  });

  // Handle backend API call after successful transaction
  const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
  if (backendRequestSentRef.current === transactionHash) {
    console.log(`Backend request already sent for hash: ${transactionHash}. Skipping duplicate.`);
    return;
  }

  backendRequestSentRef.current = transactionHash;
  setTxStatus('backendProcessing');
  setBackendMessage("Processing your order...");
  toast.loading("Processing order with our service provider...", { id: 'backend-status' });

  try {
    const response = await buyAirtime({
      requestId: requestId!,
      phone,
      serviceID: network,
      amount: amountNGN,
      cryptoUsed: parseFloat(cryptoNeeded.toFixed(selectedCrypto?.decimals || 6)),
      cryptoSymbol: selectedCrypto?.symbol!,
      transactionHash,
      userAddress: address!
    });

    console.log('Backend success response:', response);
    setTxStatus('backendSuccess');
    setBackendMessage("Airtime delivered successfully!");
    toast.success("Airtime delivered successfully!", { id: 'backend-status' });

    // Reset form
    setCrypto("");
    setNetwork("");
    setAmount("");
    setPhone("");
    setRequestId(undefined);
    backendRequestSentRef.current = null;

  } catch (error: any) {
    console.error("Backend API call failed:", error);
    setTxStatus('backendError');

    let errorMessage = error.message;
    if (errorMessage.includes('HTML instead of JSON')) {
      errorMessage = 'Server error occurred. Please try again or contact support.';
    } else if (errorMessage.includes('Invalid JSON')) {
      errorMessage = 'Communication error with server. Please try again.';
    } else if (errorMessage.includes('Failed to fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    }

    const fullMessage = `${errorMessage}. Request ID: ${requestId}`;
    setBackendMessage(fullMessage);
    toast.error(fullMessage, { id: 'backend-status' });
  }
}, [requestId, phone, network, amountNGN, cryptoNeeded, selectedCrypto?.symbol, selectedCrypto?.decimals, address]);

  // Effect to monitor approval transaction status
  useEffect(() => {
    if (!showTransactionModal) return;

    if (isApprovePending) {
      setTxStatus('waitingForApprovalSignature');
      setTransactionHashForModal(undefined);
      setTransactionError(null);
      setBackendMessage(null);
      setApprovalError(null);
      toast.info("Awaiting token approval signature...");
      backendRequestSentRef.current = null;
    } else if (approveHash && !isApprovalTxConfirmed && !isApprovalConfirming) {
      setTxStatus('sending');
      setTransactionHashForModal(approveHash);
      toast.loading("Token approval sent, waiting for confirmation...", { id: 'approval-status' });
    } else if (isApprovalConfirming) {
      setTxStatus('approving');
      setTransactionHashForModal(approveHash);
      toast.loading("Token approval confirming on blockchain...", { id: 'approval-status' });
    } else if (isApprovalTxConfirmed) {
      setTxStatus('approvalSuccess');
      setApprovalError(null);
      toast.success("Token approved! Proceeding with payment...", { id: 'approval-status' });
      
      // Refetch allowance and proceed with main transaction
      refetchAllowance();
      
      console.log("Approval confirmed! Initiating main transaction...");
    } else if (isApproveError || isApprovalConfirmError) {
      setTxStatus('approvalError');
      const errorMsg = (approveWriteError?.message || approveConfirmError?.message || "Token approval failed").split('\n')[0];
      setApprovalError(errorMsg);
      setTransactionError(errorMsg);
      toast.error(`Approval failed: ${errorMsg}`, { id: 'approval-status' });
    }
  }, [isApprovePending, approveHash, isApprovalTxConfirmed, isApprovalConfirming, isApproveError, isApprovalConfirmError, approveWriteError, approveConfirmError, showTransactionModal, refetchAllowance]);

  // Auto-trigger main transaction after approval
  useEffect(() => {
    if (isApprovalTxConfirmed && txStatus === 'approvalSuccess' && selectedCrypto && selectedCrypto.tokenType !== 0) {
      // Small delay to ensure allowance is updated
      setTimeout(() => {
        console.log("Approval confirmed! Initiating main transaction...");
        console.log("Contract call params:", {
          requestId: bytes32RequestId,
          tokenType: selectedCrypto.tokenType,
          tokenAmount: tokenAmountForOrder.toString()
        });
        
        try {
          setTxStatus('waitingForSignature');
          writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'createOrder',
            args: [
              bytes32RequestId,
              selectedCrypto.tokenType as any,
              tokenAmountForOrder,
            ],
            value: BigInt(0),
          });
        } catch (error: any) {
          console.error("Error sending main transaction after approval:", error);
          const errorMsg = error.message || "Failed to send main transaction after approval.";
          setTransactionError(errorMsg);
          setTxStatus('error');
          toast.error(errorMsg);
        }
      }, 2000); // 2 second delay
    }
  }, [isApprovalTxConfirmed, txStatus, selectedCrypto, bytes32RequestId, tokenAmountForOrder, writeContract]);

  // Effect to monitor main transaction status
  useEffect(() => {
    if (!showTransactionModal) return;
    if (['waitingForApprovalSignature', 'approving', 'approvalSuccess', 'approvalError'].includes(txStatus)) {
      return;
    }

    if (isWritePending) {
      setTxStatus('waitingForSignature');
      setTransactionHashForModal(undefined);
      setTransactionError(null);
      setBackendMessage(null);
      toast.info("Awaiting wallet signature...");
      backendRequestSentRef.current = null;
    } else if (hash && !isConfirmed && !isConfirming) {
      setTxStatus('sending');
      setTransactionHashForModal(hash);
      toast.loading("Transaction sent, waiting for blockchain confirmation...", { id: 'tx-status' });
    } else if (isConfirming) {
      setTxStatus('confirming');
      setTransactionHashForModal(hash);
      toast.loading("Transaction confirming on blockchain...", { id: 'tx-status' });
    } else if (isConfirmed) {
      if (txStatus !== 'backendProcessing' && txStatus !== 'backendSuccess' && txStatus !== 'backendError') {
        setTxStatus('success');
        setTransactionHashForModal(hash);
        toast.success("Blockchain transaction confirmed! Processing order...", { id: 'tx-status' });
        if (hash) {
          handlePostTransaction(hash);
        }
      }
    } else if (isWriteError || isConfirmError) {
      setTxStatus('error');
      const errorMsg = (writeError?.message?.split('\n')[0] || confirmError?.message?.split('\n')[0] || "Transaction failed").split('\n')[0];
      setTransactionError(errorMsg);
      setTransactionHashForModal(hash);
      toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
    } else {
      if (!['backendProcessing', 'backendSuccess', 'backendError'].includes(txStatus)) {
        setTxStatus('idle');
        setTransactionError(null);
        setBackendMessage(null);
        setTransactionHashForModal(undefined);
      }
    }
  }, [isWritePending, hash, isConfirming, isConfirmed, isWriteError, isConfirmError, writeError, confirmError, txStatus, handlePostTransaction, showTransactionModal]);

  const ensureWalletConnected = async () => {
    if (!authenticated) {
      toast.error("Please log in to proceed.");
      await connectWallet();
      return false;
    }
    if (!address) {
      toast.error("No wallet found. Please ensure a wallet is connected via Privy.");
      await connectWallet();
      return false;
    }
    if (!isOnBaseChain) {
      promptSwitchToBase();
      return false;
    }
    return true;
  };

  const handlePurchase = async () => {
    setShowTransactionModal(true);
    setTransactionError(null);
    setBackendMessage(null);
    setApprovalError(null);
    setTxStatus('idle');
    backendRequestSentRef.current = null;

    const walletConnectedAndOnBase = await ensureWalletConnected();
    if (!walletConnectedAndOnBase) {
      setShowTransactionModal(false);
      return;
    }

    if (!address || !requestId || !selectedCrypto || amountNGN <= 0) {
      toast.error("Please check all form fields and wallet connection.");
      setTxStatus('error');
      return;
    }

    // Validate phone number format
    if (phone.length < 10 || phone.length > 11) {
      toast.error("Please enter a valid Nigerian phone number (10-11 digits).");
      setTxStatus('error');
      return;
    }

    // Validate amount range
    if (amountNGN < 100 || amountNGN > 50000) {
      toast.error("Amount must be between ₦100 and ₦50,000.");
      setTxStatus('error');
      return;
    }

    // Validate crypto calculation
    if (!priceNGN || cryptoNeeded <= 0) {
      toast.error("Unable to calculate crypto amount. Please try again.");
      setTxStatus('error');
      return;
    }

    // Validate token amount calculation
    if (tokenAmountForOrder <= 0) {
      toast.error("Invalid token amount calculated. Please try again.");
      setTxStatus('error');
      return;
    }

    console.log("--- Initiating Contract Call ---");
    console.log("RequestId (bytes32):", bytes32RequestId);
    console.log("TokenType:", selectedCrypto.tokenType);
    console.log("TokenAmount for Order:", tokenAmountForOrder.toString());
    console.log("Formatted amount:", formatUnits(tokenAmountForOrder, selectedCrypto.decimals));
    console.log("Value (for ETH):", valueForEth.toString());
    console.log("Selected Crypto:", selectedCrypto.symbol);
    console.log("Needs Approval:", needsApproval);
    console.log("Current Allowance:", currentAllowance?.toString());
    console.log("Crypto needed (float):", cryptoNeeded);
    console.log("Price NGN:", priceNGN);
    console.log("Amount NGN:", amountNGN);
    console.log("--------------------------------");

    // Reset previous transaction states
    resetApprove();
    resetWrite();

    // Handle ERC20 tokens - Check if approval is needed
    if (selectedCrypto.tokenType !== 0) {
      if (!selectedCrypto.contract) {
        toast.error("Selected crypto has no contract address.");
        setTxStatus('error');
        return;
      }

      if (needsApproval) {
        toast.info("Approving token spend for this transaction...");
        setTxStatus('waitingForApprovalSignature');
        
        try {
          // Approve a reasonable amount to avoid frequent approvals
          // Use a large enough amount but not too excessive
          const approvalAmount = tokenAmountForOrder * BigInt(10); // 10x the needed amount
          const maxReasonableApproval = parseUnits('100000', selectedCrypto.decimals); // 100k tokens max
          const finalApprovalAmount = approvalAmount > maxReasonableApproval ? maxReasonableApproval : approvalAmount;
          
          console.log("Approving amount:", finalApprovalAmount.toString(), "formatted:", formatUnits(finalApprovalAmount, selectedCrypto.decimals));
          
          writeApprove({
            address: selectedCrypto.contract as Hex,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACT_ADDRESS, finalApprovalAmount],
          });
        } catch (error: any) {
          console.error("Error sending approval transaction:", error);
          const errorMsg = error.message || "Failed to send approval transaction.";
          setApprovalError(errorMsg);
          setTransactionError(errorMsg);
          setTxStatus('approvalError');
          toast.error(errorMsg);
        }
      } else {
        // Sufficient allowance, proceed directly with main transaction
        try {
          setTxStatus('waitingForSignature');
          console.log("Sending ERC20 transaction with params:", {
            contractAddress: CONTRACT_ADDRESS,
            requestId: bytes32RequestId,
            tokenType: selectedCrypto.tokenType,
            tokenAmount: tokenAmountForOrder.toString(),
            formattedAmount: formatUnits(tokenAmountForOrder, selectedCrypto.decimals)
          });
          
          writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'createOrder',
            args: [
              bytes32RequestId,
              selectedCrypto.tokenType as any,
              tokenAmountForOrder,
            ],
            value: BigInt(0),
          });
        } catch (error: any) {
          console.error("Error sending main transaction:", error);
          const errorMsg = error.message || "Failed to send transaction.";
          setTransactionError(errorMsg);
          setTxStatus('error');
          toast.error(errorMsg);
        }
      }
    } else {
      // Handle ETH - Direct payment without approval
      try {
        setTxStatus('waitingForSignature');
        console.log("Sending ETH transaction with params:", {
          contractAddress: CONTRACT_ADDRESS,
          requestId: bytes32RequestId,
          tokenType: selectedCrypto.tokenType,
          tokenAmount: tokenAmountForOrder.toString(),
          ethValue: valueForEth.toString(),
          formattedEthValue: formatUnits(valueForEth, 18)
        });
        
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'createOrder',
          args: [
            bytes32RequestId,
            selectedCrypto.tokenType as any,
            tokenAmountForOrder,
          ],
          value: valueForEth,
        });
      } catch (error: any) {
        console.error("Error sending ETH transaction:", error);
        const errorMsg = error.message || "Failed to send transaction.";
        setTransactionError(errorMsg);
        setTxStatus('error');
        toast.error(errorMsg);
      }
    }

    // FIX 1: Prevent reused requestId
    if (existingOrder && existingOrder.user && existingOrder.user !== '0x0000000000000000000000000000000000000000') {
      toast.error('Order already exists for this request. Please refresh and try again.');
      setRequestId(generateRequestId());
      return;
    }
    // FIX 2: Avoid zero token amount
    if (tokenAmountForOrder === 0n) {
      toast.error('Amount too low. Please enter a valid amount.');
      setRequestId(generateRequestId());
      return;
    }
    // FIX 4: Simulate contract before sending
    if (mainSimError) {
      toast.error('Transaction simulation failed. Please check your input.');
      setRequestId(generateRequestId());
      return;
    }
    if (!mainSimulation) {
      toast.error('Transaction simulation not ready. Please try again.');
      return;
    }
    // FIX 3: Send ETH only when needed
    const txValue = selectedCrypto?.tokenType === 0 ? valueForEth : 0n;
    
    writeContract(mainSimulation.request);
    // FIX 5: Regenerate requestId after each transaction attempt
    setRequestId(generateRequestId());
  };

  const handleCloseModal = useCallback(() => {
    setShowTransactionModal(false);
    setTxStatus('idle');
    setTransactionError(null);
    setBackendMessage(null);
    setTransactionHashForModal(undefined);
    setApprovalError(null);
    backendRequestSentRef.current = null;
  }, []);

  const canPay = crypto && network && amount && amountNGN >= 100 && amountNGN <= 50000 && phone && phone.length >= 10 && priceNGN && requestId && tokenAmountForOrder > 0;

  const isButtonDisabled = loading || !canPay ||
                           isApprovePending || isApprovalConfirming ||
                           isWritePending || isConfirming || txStatus === 'backendProcessing' ||
                           !isOnBaseChain || isSwitchingChain;

  if (loading) return <div className="p-10 text-center">Loading…</div>

  return (
    <AuthGuard>
      <div className="container py-10 max-w-xl mx-auto">
        <BackToDashboard />
        <h1 className="text-3xl font-bold mb-4">Buy Airtime</h1>
        <p className="text-muted-foreground mb-8">
          Purchase airtime using USDT, USDC, or ETH on Base chain.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Crypto to Airtime Payment</CardTitle>
            <CardDescription>
              Preview and calculate your airtime purchase with crypto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* crypto */}
            <div className="space-y-2">
              <Label htmlFor="crypto-select">Pay With</Label>
              <Select value={crypto} onValueChange={setCrypto}>
                <SelectTrigger id="crypto-select">
                  <SelectValue placeholder="Select crypto" />
                </SelectTrigger>
                <SelectContent>
                  {CRYPTOS.map(c => (
                    <SelectItem key={c.symbol} value={c.symbol}>
                      {c.symbol} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* network */}
            <div className="space-y-2">
              <Label htmlFor="network-select">Network Provider</Label>
              <Select value={network} onValueChange={setNetwork}>
                <SelectTrigger id="network-select">
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {NETWORKS.map(n => (
                    <SelectItem key={n.serviceID} value={n.serviceID}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* amount */}
            <div className="space-y-2">
              <Label htmlFor="amount-input">Amount (NGN)</Label>
              <Input
                id="amount-input"
                type="number"
                placeholder="Enter amount (₦100 - ₦50,000)"
                value={amount}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "" || val === "0") {
                    setAmount("");
                  } else {
                    const numVal = Math.max(0, parseInt(val));
                    setAmount(String(Math.min(numVal, 50000))); // Cap at 50k
                  }
                }}
                min="100"
                max="50000"
                disabled={!selectedCrypto}
              />
              {amountNGN > 0 && priceNGN && selectedCrypto && (
                <div className="text-sm text-muted-foreground flex items-center justify-between">
                  <span>
                    You will pay: ~{cryptoNeeded.toFixed(selectedCrypto.decimals)}{" "}
                    {selectedCrypto.symbol}
                  </span>
                  <Badge variant="secondary">
                    1 {selectedCrypto.symbol} = ₦{priceNGN?.toLocaleString()}
                  </Badge>
                </div>
              )}
              {amountNGN > 0 && amountNGN < 100 && (
                <p className="text-sm text-red-500">Minimum amount is ₦100.</p>
              )}
              {amountNGN > 50000 && (
                <p className="text-sm text-red-500">Maximum amount is ₦50,000.</p>
              )}
            </div>

            {/* phone */}
            <div className="space-y-2">
              <Label htmlFor="phone-input">Phone Number</Label>
              <Input
                id="phone-input"
                type="tel"
                placeholder="Enter phone number (11 digits)"
                value={phone}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, "")
                  setPhone(v.slice(0, 11))
                }}
                maxLength={11}
              />
              {phone && phone.length < 10 && (
                <p className="text-sm text-red-500">Phone number must be at least 10 digits.</p>
              )}
            </div>

            {/* Approval status for ERC20 tokens */}
            {selectedCrypto && selectedCrypto.tokenType !== 0 && currentAllowance !== undefined && (
              <div className="text-sm p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  {needsApproval ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span>Token approval required for this transaction</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Sufficient token allowance available</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* summary */}
            <div className="border-t pt-4 space-y-2 text-sm">
              {requestId && (
                <div className="flex justify-between">
                  <span>Request ID:</span>
                  <span className="text-muted-foreground font-mono text-xs">{requestId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Amount (NGN):</span>
                <span>
                  {amountNGN > 0 ? `₦${amountNGN.toLocaleString()}` : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>You will pay:</span>
                <span>
                  {cryptoNeeded > 0 && selectedCrypto ? (
                    <Badge variant="outline">
                      {cryptoNeeded.toFixed(selectedCrypto.decimals)}{" "}
                      {selectedCrypto.symbol}
                    </Badge>
                  ) : (
                    "--"
                  )}
                </span>
              </div>
            </div>
            
            <Button
              className="w-full"
              onClick={handlePurchase}
              // disabled={isButtonDisabled}
            >
              {isSwitchingChain ? "Switching Network..." :
              !isOnBaseChain ? "Switch to Base Network" :
              isApprovePending ? "Awaiting Approval Signature..." :
              isApprovalConfirming ? "Approving Token..." :
              txStatus === 'waitingForSignature' ? "Awaiting Payment Signature..." :
              txStatus === 'sending' ? "Sending Transaction..." :
              txStatus === 'confirming' ? "Confirming Blockchain..." :
              txStatus === 'success' ? "Blockchain Confirmed!" :
              txStatus === 'backendProcessing' ? "Processing Order..." :
              txStatus === 'backendSuccess' ? "Payment Successful!" :
              txStatus === 'backendError' ? "Payment Failed - Try Again" :
              txStatus === 'error' ? "Transaction Failed - Try Again" :
              canPay ? (needsApproval ? "Approve & Purchase Airtime" : "Purchase Airtime") :
              "Fill all details"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <TransactionStatusModal
        isOpen={showTransactionModal}
        onClose={handleCloseModal}
        txStatus={txStatus}
        transactionHash={transactionHashForModal}
        errorMessage={transactionError || approvalError}
        backendMessage={backendMessage}
        requestId={requestId}
      />
    </AuthGuard>
  )
}
