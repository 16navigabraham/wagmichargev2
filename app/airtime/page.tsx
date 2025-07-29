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
import { paycryptOnchain } from "@/lib/paycryptOnchain";
import { ERC20_ABI } from "@/config/erc20Abi";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSimulateContract } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { parseEther, parseUnits, toBytes, toHex, Hex, formatUnits } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";
import { useBaseNetworkEnforcer } from '@/hooks/useBaseNetworkEnforcer';

import { buyAirtime } from "@/lib/api";
import { TokenConfig } from "@/lib/tokenlist";
import { fetchActiveTokensWithMetadata } from "@/lib/tokenUtils";

const NETWORKS = [
  { serviceID: "mtn", name: "MTN" },
  { serviceID: "glo", name: "Glo" },
  { serviceID: "airtel", name: "Airtel" },
  { serviceID: "9mobile", name: "9mobile" },
]

function generateRequestId() {
  return `${Date.now().toString()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

// Fetch prices for dynamic tokens
async function fetchPrices(tokenList: TokenConfig[]) {
  if (!tokenList || tokenList.length === 0) return {};
  const ids = tokenList.map(c => c.coingeckoId).join(",");
  // Ensure to handle API key if CoinGecko requires one for production
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`);
  return res.ok ? await res.json() : {};
}

export default function AirtimePage() {
  const [activeTokens, setActiveTokens] = useState<TokenConfig[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>(""); // Stores the address of the selected token
  const [network, setNetwork] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [prices, setPrices] = useState<any>({});
  const [loading, setLoading] = useState(true);
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

  // Load tokens and prices on initial mount
  useEffect(() => {
    async function loadTokensAndPrices() {
      setLoading(true);
      try {
        const tokens = await fetchActiveTokensWithMetadata();
        // Filter out ETH (tokenType 0) as per requirement
        setActiveTokens(tokens.filter(token => token.tokenType !== 0));
        const prices = await fetchPrices(tokens);
        setPrices(prices);
      } catch (error) {
        console.error("Error loading tokens and prices:", error);
        toast.error("Failed to load token data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadTokensAndPrices();
  }, []);

  // Generate requestId when form has data
  useEffect(() => {
    if ((selectedToken || network || amount || phone) && !requestId) {
      setRequestId(generateRequestId());
    } else if (!(selectedToken || network || amount || phone) && requestId) {
      setRequestId(undefined);
    }
  }, [selectedToken, network, amount, phone, requestId]);

  // Derived values for selected token
  const selectedTokenObj = activeTokens.find(t => t.address === selectedToken);
  const priceNGN = selectedTokenObj ? prices[selectedTokenObj.coingeckoId]?.ngn : null;
  const amountNGN = Number(amount) || 0;
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0;
  const tokenAmountForOrder: bigint = selectedTokenObj ? parseUnits(cryptoNeeded.toFixed(selectedTokenObj.decimals), selectedTokenObj.decimals) : BigInt(0);
  // ETH is not supported, so valueForEth will always be BigInt(0)
  const valueForEth: bigint = BigInt(0); // selectedTokenObj?.symbol === 'ETH' && cryptoNeeded > 0 ? parseEther(cryptoNeeded.toFixed(18)) : BigInt(0);
  const bytes32RequestId: Hex = requestId ? toHex(toBytes(requestId), { size: 32 }) : toHex(toBytes(""), { size: 32 });

  // Check current allowance for ERC20 tokens
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: selectedTokenObj?.address as Hex,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as Hex, CONTRACT_ADDRESS],
    query: {
      // Only enable if a token is selected and it's an ERC20 token (tokenType !== 0)
      enabled: Boolean(selectedTokenObj?.address && address && selectedTokenObj?.tokenType !== 0),
    },
  });

  // Check if approval is needed
  useEffect(() => {
    // Approval is only relevant for ERC20 tokens (tokenType !== 0)
    if (!selectedTokenObj || selectedTokenObj.tokenType === 0 || !currentAllowance || !tokenAmountForOrder) {
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
  }, [currentAllowance, tokenAmountForOrder, selectedTokenObj]);

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
    args: [BigInt(bytes32RequestId)],
    query: { enabled: Boolean(requestId && address) },
  });

  // Simulate main contract transaction
  const tokenAmountForZeroCheck = BigInt(0);
  // Since ETH is not supported, simulationValue will always be undefined
  const simulationValue = undefined; // selectedTokenObj?.tokenType === 0 ? valueForEth : undefined;
  const { data: mainSimulation, error: mainSimError } = useSimulateContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'createOrder',
    args: [bytes32RequestId, selectedTokenObj?.tokenType as any, tokenAmountForOrder], // Use selectedTokenObj?.tokenType
    value: simulationValue,
    query: { enabled: Boolean(requestId && address && tokenAmountForOrder > tokenAmountForZeroCheck && selectedTokenObj?.tokenType !== undefined) },
  });

  // Handle backend API call after successful transaction
  const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
    // Prevent duplicate backend requests
    if (backendRequestSentRef.current === transactionHash) {
      console.log(`Backend request already sent for hash: ${transactionHash}. Skipping duplicate.`);
      return;
    }

    // Onchain payment logic (production-ready)
    try {
      setTxStatus('sending');
      await paycryptOnchain({
        userAddress: address!,
        tokenAddress: selectedTokenObj ? selectedTokenObj.contract ?? CONTRACT_ADDRESS : CONTRACT_ADDRESS,
        amount: tokenAmountForOrder,
        requestId: bytes32RequestId,
        walletClient: undefined, // Replace with actual walletClient for production
        publicClient: undefined, // Replace with actual publicClient for production
      });
      setTxStatus('success');
    } catch (err: any) {
      setTxStatus('error');
      setTransactionError(err.message || 'Onchain payment failed');
      toast.error(err.message || 'Onchain payment failed', { id: 'backend-status' });
      return;
    }

    // Backend processing after successful onchain payment
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
        cryptoUsed: parseFloat(cryptoNeeded.toFixed(selectedTokenObj?.decimals || 6)),
        cryptoSymbol: selectedTokenObj?.symbol ?? "",
        transactionHash,
        userAddress: address!
      });

      setTxStatus('backendSuccess');
      setBackendMessage("Airtime delivered successfully!");
      toast.success("Airtime delivered successfully!", { id: 'backend-status' });

      // Reset form for next transaction
      setSelectedToken("");
      setNetwork("");
      setAmount("");
      setPhone("");
      setRequestId(undefined);
      backendRequestSentRef.current = null;

    } catch (error: any) {
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
  }, [requestId, phone, network, amountNGN, cryptoNeeded, selectedTokenObj?.symbol, selectedTokenObj?.decimals, address, selectedTokenObj?.contract, tokenAmountForOrder, bytes32RequestId]);

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
    if (isApprovalTxConfirmed && txStatus === 'approvalSuccess' && selectedTokenObj && selectedTokenObj.tokenType !== 0) {
      // Small delay to ensure allowance is updated
      setTimeout(() => {
        console.log("Approval confirmed! Initiating main transaction...");
        console.log("Contract call params:", {
          requestId: bytes32RequestId,
          tokenType: selectedTokenObj.tokenType,
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
              selectedTokenObj.tokenType as any, // Cast to any to avoid TS error with strict types
              tokenAmountForOrder,
            ],
            value: undefined, // ERC20 transactions don't send ETH value
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
  }, [isApprovalTxConfirmed, txStatus, selectedTokenObj, bytes32RequestId, tokenAmountForOrder, writeContract]);

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

    if (!address || !requestId || !selectedTokenObj || amountNGN <= 0) {
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

    // Check for existing order
    if (existingOrder && existingOrder.user && existingOrder.user !== '0x0000000000000000000000000000000000000000') {
      toast.error('Order already exists for this request. Please refresh and try again.');
      setRequestId(generateRequestId());
      setTxStatus('error');
      return;
    }

    // Validate simulation
    if (mainSimError) {
      toast.error(`Transaction simulation failed: ${mainSimError.message || 'Unknown error'}`);
      setTxStatus('error');
      return;
    }
    if (!mainSimulation) {
      toast.error('Transaction simulation not ready. Please try again.');
      setTxStatus('error');
      return;
    }

    console.log("--- Initiating Contract Call ---");
    console.log("RequestId (bytes32):", bytes32RequestId);
    console.log("TokenType:", selectedTokenObj.tokenType);
    console.log("TokenAmount for Order:", tokenAmountForOrder.toString());
    console.log("Formatted amount:", formatUnits(tokenAmountForOrder, selectedTokenObj.decimals));
    console.log("Value (for ETH - should be 0):", valueForEth.toString());
    console.log("Selected Crypto:", selectedTokenObj.symbol);
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
    // Since ETH is not supported, we only handle ERC20 tokens here
    if (!selectedTokenObj.contract) {
      toast.error("Selected crypto has no contract address.");
      setTxStatus('error');
      return;
    }

    if (needsApproval) {
      toast.info("Approving token spend for this transaction...");
      setTxStatus('waitingForApprovalSignature');
      
      try {
        // Approve a reasonable amount to avoid frequent approvals
        const approvalAmount = tokenAmountForOrder * BigInt(10); // 10x the needed amount
        // Define a maximum reasonable approval amount to prevent approving excessively large sums
        const maxReasonableApproval = parseUnits('1000000000000000000000000000', 18); // A very large number, adjust as needed
        const finalApprovalAmount = approvalAmount > maxReasonableApproval ? maxReasonableApproval : approvalAmount;
        
        console.log("Approving amount:", finalApprovalAmount.toString(), "formatted:", formatUnits(finalApprovalAmount, selectedTokenObj.decimals));
        
        writeApprove({
          address: selectedTokenObj.contract as Hex,
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
          tokenType: selectedTokenObj.tokenType,
          tokenAmount: tokenAmountForOrder.toString(),
          formattedAmount: formatUnits(tokenAmountForOrder, selectedTokenObj.decimals)
        });
        
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'createOrder',
          args: [
            bytes32RequestId,
            selectedTokenObj.tokenType as any,
            tokenAmountForOrder,
          ],
          value: undefined, // ERC20 transactions don't send ETH value
        });
      } catch (error: any) {
        console.error("Error sending main transaction:", error);
        const errorMsg = error.message || "Failed to send transaction.";
        setTransactionError(errorMsg);
        setTxStatus('error');
        toast.error(errorMsg);
      }
    }

    // Regenerate requestId after each transaction attempt
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

  // Determine if the "Purchase Airtime" button should be enabled
  // It should be enabled if:
  // 1. Not currently loading tokens
  // 2. All required fields are filled and valid (selectedToken, network, amount, phone)
  // 3. Amount is within valid range (100-50000 NGN)
  // 4. Phone number is valid (10-11 digits)
  // 5. Price for the selected token is available
  // 6. Crypto amount needed is greater than 0
  // 7. RequestId is generated
  // 8. Token amount for order is greater than 0
  // 9. Not currently switching chains or not on Base chain (if enforced)
  // 10. No pending Wagmi transactions (approve, write, confirming)
  // 11. Not in backend processing state
  const canPay = selectedToken && network && amount && amountNGN >= 100 && amountNGN <= 50000 && phone && phone.length >= 10 && priceNGN && requestId && tokenAmountForOrder > 0;

  const isButtonDisabled = loading || !canPay ||
                           isApprovePending || isApprovalConfirming || isApprovalTxConfirmed && needsApproval || // Disable if approval is pending or confirmed but still needed
                           isWritePending || isConfirming || txStatus === 'backendProcessing' ||
                           !isOnBaseChain || isSwitchingChain;

  if (loading) return (
    <AuthGuard>
      <div className="container py-10 max-w-xl mx-auto">
        <div className="flex items-center justify-center p-10">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Loading active tokens...</span>
        </div>
      </div>
    </AuthGuard>
  );

  return (
    <AuthGuard>
      <div className="container py-10 max-w-xl mx-auto">
        <BackToDashboard />
        <h1 className="text-3xl font-bold mb-4">Buy Airtime</h1>
        <p className="text-muted-foreground mb-8">
          Purchase airtime using supported cryptocurrencies on Base chain.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Crypto to Airtime Payment</CardTitle>
            <CardDescription>
              Preview and calculate your airtime purchase with crypto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Token selection - dynamic from contract */}
            <div className="space-y-2">
              <Label htmlFor="token-select">Pay With</Label>
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger id="token-select">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {activeTokens.length === 0 ? (
                    <SelectItem value="" disabled>No tokens available</SelectItem>
                  ) : (
                    activeTokens.map(token => (
                      <SelectItem key={token.address} value={token.address}>
                        {token.symbol} - {token.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {activeTokens.length === 0 && !loading && (
                <p className="text-sm text-yellow-600">
                  No active ERC20 tokens found from contract.
                </p>
              )}
            </div>

            {/* Network provider */}
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

            {/* Amount input */}
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
                disabled={!selectedTokenObj}
              />
              {amountNGN > 0 && priceNGN && selectedTokenObj && (
                <div className="text-sm text-muted-foreground flex items-center justify-between">
                  <span>
                    You will pay: ~{cryptoNeeded.toFixed(selectedTokenObj.decimals)} {selectedTokenObj.symbol}
                  </span>
                  <Badge variant="secondary">
                    1 {selectedTokenObj.symbol} = ₦{priceNGN?.toLocaleString()}
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

            {/* Phone number input */}
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
            {selectedTokenObj && selectedTokenObj.tokenType !== 0 && currentAllowance !== undefined && (
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

            {/* Transaction summary */}
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
                  {cryptoNeeded > 0 && selectedTokenObj ? (
                    <Badge variant="outline">
                      {cryptoNeeded.toFixed(selectedTokenObj.decimals)} {selectedTokenObj.symbol}
                    </Badge>
                  ) : (
                    "--"
                  )}
                </span>
              </div>
              {selectedTokenObj && (
                <div className="flex justify-between">
                  <span>Network:</span>
                  <span>{NETWORKS.find(n => n.serviceID === network)?.name || network || "--"}</span>
                </div>
              )}
              {phone && (
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span className="font-mono">{phone}</span>
                </div>
              )}
            </div>
            
            <Button
              className="w-full"
              onClick={handlePurchase}
              // qqqqqqqaaaaq // Use the combined disabled state
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

            {/* Active tokens info */}
            {activeTokens.length > 0 && (
              <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                <p className="font-medium mb-1">Active Tokens ({activeTokens.length}):</p>
                <p>{activeTokens.map(t => t.symbol).join(", ")}</p>
              </div>
            )}
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
