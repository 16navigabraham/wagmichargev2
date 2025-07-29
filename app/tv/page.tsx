// app/tv/page.tsx
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
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { parseUnits, toBytes, toHex, Hex, fromHex, formatUnits } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";
import { useBaseNetworkEnforcer } from '@/hooks/useBaseNetworkEnforcer';

import { payTVSubscription } from "@/lib/api";
import { TokenConfig } from "@/lib/tokenlist";
import { fetchActiveTokensWithMetadata } from "@/lib/tokenUtils";

interface TVProvider {
  serviceID: string
  name: string
}

interface TVPlan {
  variation_code: string
  name: string
  variation_amount: string
}

const SMART_CARD_LENGTHS: Record<string, number[]> = {
  dstv: [10, 11],
  gotv: [10, 11],
  startimes: [10, 11],
  showmax: [10, 11],
  default: [10, 11, 12],
}

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}

/* ---------- fetch helpers ---------- */

async function fetchPrices(tokenList: TokenConfig[]): Promise<Record<string, any>> {
  const ids = tokenList.map((c: TokenConfig) => c.coingeckoId).join(",");
  if (!ids) return {};
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`);
  return res.ok ? await res.json() : {};
}

async function fetchTVProviders() {
  try {
    const res = await fetch("/api/vtpass/services?identifier=tv-subscription")
    if (!res.ok) {
      console.error("Failed to fetch TV providers:", res.status);
      return [];
    }
    const data = await res.json()
    return data.content || []
  } catch (error) {
    console.error("Error fetching TV providers:", error);
    return [];
  }
}

async function fetchTVPlans(serviceID: string) {
  try {
    const res = await fetch(`/api/vtpass/service-variations?serviceID=${serviceID}`)
    if (!res.ok) {
      console.error("Failed to fetch TV plans:", res.status);
      return [];
    }
    const data = await res.json()
    return data.content?.variations || []
  } catch (error) {
    console.error("Error fetching TV plans:", error);
    return [];
  }
}

/* ---------- VTpass verify - FIXED VERSION ---------- */
async function verifyCard(billersCode: string, serviceID: string) {
  try {
    const res = await fetch("/api/vtpass/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        billersCode, 
        serviceID, 
        type: "smartcard" 
      }),
    })

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Verify API error:", res.status, errorText);
      throw new Error(`Verification failed: ${res.status}`);
    }

    const data = await res.json()

    if (data.success) {
      return data.data || {};
    } else {
      throw new Error(data.error || "Verification failed");
    }
  } catch (error) {
    console.error("Verify card error:", error);
    throw error;
  }
}

function getSmartCardLength(serviceID: string): number[] {
  const id = serviceID.toLowerCase()
  return SMART_CARD_LENGTHS[id] ?? SMART_CARD_LENGTHS.default
}

export default function TVPage() {
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>("");
  const [provider, setProvider] = useState("");
  const [plan, setPlan] = useState("");
  const [smartCardNumber, setSmartCardNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [currentBouquet, setCurrentBouquet] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [renewalAmount, setRenewalAmount] = useState("");
  const [providers, setProviders] = useState<TVProvider[]>([]);
  const [plans, setPlans] = useState<TVPlan[]>([]);
  const [prices, setPrices] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [verifyingCard, setVerifyingCard] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string | undefined>(undefined);

  const [activeTokens, setActiveTokens] = useState<TokenConfig[]>([]);

  const [txStatus, setTxStatus] = useState<'idle' | 'waitingForApprovalSignature' | 'approving' | 'approvalSuccess' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'backendProcessing' | 'backendSuccess' | 'backendError' | 'error'>('idle');
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);

  const backendRequestSentRef = useRef<Hex | null>(null);

  const { connectWallet, authenticated } = usePrivy();
  const { address } = useAccount();
  const { isOnBaseChain, isSwitchingChain, promptSwitchToBase } = useBaseNetworkEnforcer();

  /* initial load */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const tokens = await fetchActiveTokensWithMetadata();
        if (!mounted) return;
        setActiveTokens(tokens.filter(token => token.tokenType !== 0)); // Filter out ETH
        const prices = await fetchPrices(tokens);
        if (!mounted) return;
        setPrices(prices);
        const prov = await fetchTVProviders();
        if (!mounted) return;
        setProviders(prov);
      } catch (error) {
        console.error("Error loading tokens, prices, or providers:", error);
        toast.error("Failed to load essential data. Please try again.");
      } finally {
        setLoading(false);
        setLoadingProviders(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /* plans when provider changes */
  useEffect(() => {
    if (!provider) {
        setPlans([]);
        setPlan("");
        return;
    }
    setLoadingPlans(true)
    fetchTVPlans(provider).then(setPlans).finally(() => setLoadingPlans(false))
  }, [provider])

  /* requestId generator */
  useEffect(() => {
    if ((selectedTokenAddress || provider || plan || smartCardNumber || customerName || verificationSuccess) && !requestId)
      setRequestId(generateRequestId())
    else if (!(selectedTokenAddress || provider || plan || smartCardNumber || customerName || verificationSuccess) && requestId) {
      setRequestId(undefined)
    }
  }, [selectedTokenAddress, provider, plan, smartCardNumber, customerName, verificationSuccess, requestId])

  /* auto-verify card - FIXED VERSION */
  useEffect(() => {
    if (!provider || !smartCardNumber) {
      setCustomerName("")
      setCurrentBouquet("")
      setDueDate("")
      setRenewalAmount("")
      setVerificationError("")
      setVerificationSuccess(false)
      return
    }

    const validLengths = getSmartCardLength(provider)
    if (!validLengths.includes(smartCardNumber.length)) {
      setCustomerName("")
      setCurrentBouquet("")
      setDueDate("")
      setRenewalAmount("")
      setVerificationError(`Please enter a valid ${validLengths.join(" or ")} digit smart card number for ${providers.find(p => p.serviceID === provider)?.name || 'this provider'}.`)
      setVerificationSuccess(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setVerifyingCard(true)
      setVerificationError("")
      setVerificationSuccess(false)
      setCustomerName("")
      setCurrentBouquet("")
      setDueDate("")
      setRenewalAmount("")

      try {
        console.log("Verifying card:", smartCardNumber, "for provider:", provider);
        const content = await verifyCard(smartCardNumber, provider)
        console.log("Verification response:", content);

        const name = String(content?.Customer_Name || "").trim()
        const bouquet = String(content?.Current_Bouquet || "").trim()
        const due = String(content?.Due_Date || "").trim()
        const renewal = String(content?.Renewal_Amount || "").trim()

        if (!name) throw new Error("Customer name not found. Please check the smart card number.")

        setCustomerName(name)
        setCurrentBouquet(bouquet)
        setDueDate(due)
        setRenewalAmount(renewal)
        setVerificationSuccess(true)
        toast.success(`Card verified for ${name}`)
      } catch (err: any) {
        console.error("Verification error:", err);
        setVerificationError(err.message || "Verification failed. Please try again.")
        toast.error("Card verification failed")
      } finally {
        setVerifyingCard(false)
      }
    }, 1000) // Increased delay to 1 second

    return () => clearTimeout(timeoutId)
  }, [smartCardNumber, provider, providers])

  // Derived values
  const selectedCrypto = activeTokens.find(c => c.address === selectedTokenAddress);
  const selectedPlan = plans.find(p => p.variation_code === plan);
  const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null;
  const amountNGN = selectedPlan ? Number(selectedPlan.variation_amount) : 0;
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0;

  const tokenAmountForOrder: bigint = selectedCrypto ? parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals) : BigInt(0);
  const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 });

  // Check if requestId is already used
  const { data: existingOrder } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getOrder',
    args: [fromHex(bytes32RequestId, 'bigint')],
    query: { enabled: Boolean(requestId && address) },
  });

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

  // Handle backend API call after successful transaction
  const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
    if (backendRequestSentRef.current === transactionHash) {
      console.log(`Backend request already sent for hash: ${transactionHash}. Skipping duplicate.`);
      return;
    }

    backendRequestSentRef.current = transactionHash;
    setTxStatus('backendProcessing');
    setBackendMessage("Processing your order...");
    toast.loading("Processing order with VTpass...", { id: 'backend-status' });

    try {
      const response = await payTVSubscription({
        requestId: requestId!,
        smartcard_number: smartCardNumber,
        serviceID: provider,
        variation_code: plan,
        amount: amountNGN,
        phone: smartCardNumber, // Using smartCardNumber as phone
        cryptoUsed: parseFloat(cryptoNeeded.toFixed(selectedCrypto?.decimals || 6)),
        cryptoSymbol: selectedCrypto?.symbol!,
        transactionHash,
        userAddress: address!
      });

      console.log('Backend success response:', response);
      setTxStatus('backendSuccess');
      setBackendMessage("TV subscription paid successfully!");
      toast.success("TV subscription paid successfully!", { id: 'backend-status' });

      // Reset form for next transaction after a delay
      setTimeout(() => {
        setSelectedTokenAddress("");
        setProvider("");
        setPlan("");
        setSmartCardNumber("");
        setCustomerName("");
        setCurrentBouquet("");
        setDueDate("");
        setRenewalAmount("");
        setVerificationSuccess(false);
        setRequestId(undefined);
        backendRequestSentRef.current = null;
      }, 3000); // 3 second delay to allow user to see success

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
  }, [requestId, smartCardNumber, provider, plan, amountNGN, cryptoNeeded, selectedCrypto?.symbol, selectedCrypto?.decimals, address]);

  // Effect to monitor approval transaction status
  useEffect(() => {
    if (!showTransactionModal) return;

    if (isApprovePending) {
      setTxStatus('waitingForApprovalSignature');
      setTransactionHashForModal(undefined);
      setTransactionError(null);
      setBackendMessage(null);
      toast.info("Awaiting token approval signature...");
      backendRequestSentRef.current = null;
    } else if (approveHash && !isApprovalTxConfirmed && !isApprovalConfirming) {
      setTxStatus('approving');
      setTransactionHashForModal(approveHash);
      toast.loading("Token approval sent, waiting for confirmation...", { id: 'approval-status' });
    } else if (isApprovalConfirming) {
      setTxStatus('approving');
      setTransactionHashForModal(approveHash);
      toast.loading("Token approval confirming on blockchain...", { id: 'approval-status' });
    } else if (isApprovalTxConfirmed) {
      setTxStatus('approvalSuccess');
      toast.success("Token approved! Proceeding with payment...", { id: 'approval-status' });
      
      console.log("Approval confirmed! Initiating main transaction...");
      
      // Automatically proceed with main transaction
      setTimeout(() => {
        console.log("Contract call params:", {
          requestId: bytes32RequestId,
          tokenAddress: selectedCrypto?.address,
          amount: tokenAmountForOrder.toString()
        });
        
        try {
          setTxStatus('waitingForSignature');
          writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'createOrder',
            args: [
              bytes32RequestId,
              selectedCrypto?.address as Hex, // Use token address directly
              tokenAmountForOrder,
            ],
            value: undefined,
          });
        } catch (error: any) {
          console.error("Error sending main transaction after approval:", error);
          const errorMsg = error.message || "Failed to send main transaction after approval.";
          setTransactionError(errorMsg);
          setTxStatus('error');
          toast.error(errorMsg);
        }
      }, 2000); // 2 second delay
      
    } else if (isApproveError || isApprovalConfirmError) {
      setTxStatus('error');
      const errorMsg = (approveWriteError?.message || approveConfirmError?.message || "Token approval failed").split('\n')[0];
      setTransactionError(errorMsg);
      toast.error(`Approval failed: ${errorMsg}`, { id: 'approval-status' });
    }
  }, [isApprovePending, approveHash, isApprovalTxConfirmed, isApprovalConfirming, isApproveError, isApprovalConfirmError, approveWriteError, approveConfirmError, showTransactionModal, bytes32RequestId, selectedCrypto?.address, tokenAmountForOrder, writeContract]);

  // Effect to monitor main transaction status
  useEffect(() => {
    if (!showTransactionModal) return;
    
    // Skip if we're in approval phase
    if (['waitingForApprovalSignature', 'approving', 'approvalSuccess'].includes(txStatus)) {
      return;
    }

    if (isWritePending) {
      setTxStatus('waitingForSignature');
      setTransactionHashForModal(undefined);
      setTransactionError(null);
      setBackendMessage(null);
      toast.info("Awaiting wallet signature for payment...");
      backendRequestSentRef.current = null;
    } else if (hash && !isConfirmed && !isConfirming) {
      setTxStatus('sending');
      setTransactionHashForModal(hash);
      toast.loading("Payment transaction sent, waiting for blockchain confirmation...", { id: 'tx-status' });
    } else if (isConfirming) {
      setTxStatus('confirming');
      setTransactionHashForModal(hash);
      toast.loading("Payment transaction confirming on blockchain...", { id: 'tx-status' });
    } else if (isConfirmed) {
      if (txStatus !== 'backendProcessing' && txStatus !== 'backendSuccess' && txStatus !== 'backendError') {
        setTxStatus('success');
        setTransactionHashForModal(hash);
        toast.success("Blockchain transaction confirmed! Processing order...", { id: 'tx-status' });
        
        // Process backend transaction
        if (hash) {
          handlePostTransaction(hash);
        }
      }
    } else if (isWriteError || isConfirmError) {
      setTxStatus('error');
      const errorMsg = (writeError?.message?.split('\n')[0] || confirmError?.message?.split('\n')[0] || "Wallet transaction failed or was rejected.").split('\n')[0];
      setTransactionError(errorMsg);
      setTransactionHashForModal(hash);
      toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
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
    setTxStatus('idle');
    backendRequestSentRef.current = null;

    const walletConnectedAndOnBase = await ensureWalletConnected();
    if (!walletConnectedAndOnBase) {
      setShowTransactionModal(false);
      return;
    }

    if (!address) {
      toast.error("Wallet address not found after connection. Please refresh and try again.");
      setTxStatus('error');
      return;
    }
    if (!requestId) {
      toast.error("Request ID not generated. Please fill all form details.");
      setTxStatus('error');
      return;
    }
    if (!verificationSuccess || !customerName) {
      toast.error("Please verify smart card number before proceeding with purchase.");
      setTxStatus('error');
      return;
    }
    if (!selectedPlan) {
      toast.error("Please select a subscription plan.");
      setTxStatus('error');
      return;
    }
    if (amountNGN <= 0) {
      toast.error("Selected plan has an invalid amount.");
      setTxStatus('error');
      return;
    }
    if (!selectedCrypto) {
      toast.error("Please select a cryptocurrency.");
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
    if (tokenAmountForOrder === 0n) {
      toast.error('Amount too low. Please enter a valid amount.');
      setRequestId(generateRequestId());
      setTxStatus('error');
      return;
    }

    console.log("--- Initiating ERC20 Transaction Flow ---");
    console.log("RequestId (bytes32):", bytes32RequestId);
    console.log("Token Address:", selectedCrypto.address);
    console.log("TokenAmount for Order (parsed):", tokenAmountForOrder.toString());
    console.log("Selected Crypto:", selectedCrypto.symbol);
    console.log("Crypto Needed (float):", cryptoNeeded);
    console.log("Selected Crypto Decimals:", selectedCrypto.decimals);
    console.log("----------------------------------------");

    resetApprove();
    resetWrite();

    if (!selectedCrypto.address) {
      toast.error("Selected crypto has no contract address.");
      setTxStatus('error');
      return;
    }

    // COMPULSORY TOKEN APPROVAL - Always start with approval for all ERC20 tokens
    toast.info("Approving token spend for this transaction...");
    setTxStatus('waitingForApprovalSignature');
    
    try {
      // Approve unlimited amount for convenience (standard practice)
      const unlimitedApproval = parseUnits('115792089237316195423570985008687907853269984665640564039457584007913129639935', 0);
      
      console.log("Approving unlimited amount for future transactions");
      
      writeApprove({
        address: selectedCrypto.address as Hex,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, unlimitedApproval],
      });
    } catch (error: any) {
      console.error("Error sending approval transaction:", error);
      const errorMsg = error.message || "Failed to send approval transaction.";
      setTransactionError(errorMsg);
      setTxStatus('error');
      toast.error(errorMsg);
    }

    // Regenerate requestId for next transaction
    setRequestId(generateRequestId());
  };

  const handleCloseModal = useCallback(() => {
    // Don't allow closing during critical phases
    if (['waitingForApprovalSignature', 'approving', 'waitingForSignature', 'sending', 'confirming', 'backendProcessing'].includes(txStatus)) {
      toast.info("Please wait for the transaction to complete before closing.");
      return;
    }
    
    setShowTransactionModal(false);
    setTxStatus('idle');
    setTransactionError(null);
    setBackendMessage(null);
    setTransactionHashForModal(undefined);
    backendRequestSentRef.current = null;
  }, [txStatus]);

  const canPay =
    selectedTokenAddress &&
    provider &&
    plan &&
    smartCardNumber &&
    customerName &&
    verificationSuccess &&
    priceNGN &&
    amountNGN > 0 &&
    requestId;

  const isButtonDisabled = loading || loadingProviders || loadingPlans || verifyingCard || !canPay ||
                           ['waitingForApprovalSignature', 'approving', 'waitingForSignature', 'sending', 'confirming', 'backendProcessing'].includes(txStatus) ||
                           isApprovePending || isApprovalConfirming ||
                           isWritePending || isConfirming ||
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
        <h1 className="text-3xl font-bold mb-4">Pay TV Subscription</h1>
        <p className="text-muted-foreground mb-8">
          Pay for your TV subscription using supported ERC20 cryptocurrencies on Base chain.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Crypto to TV Subscription</CardTitle>
            <CardDescription>
              Preview and calculate your TV subscription payment with crypto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* crypto selection */}
            <div className="space-y-2">
              <Label htmlFor="crypto-select">Pay With</Label>
              <Select value={selectedTokenAddress} onValueChange={setSelectedTokenAddress}>
                <SelectTrigger id="crypto-select">
                  <SelectValue placeholder="Select ERC20 token" />
                </SelectTrigger>
                <SelectContent>
                  {activeTokens.length === 0 ? (
                    <SelectItem value="" disabled>No ERC20 tokens available</SelectItem>
                  ) : (
                    activeTokens.map(c => (
                      <SelectItem key={c.address} value={c.address}>
                        {c.symbol} - {c.name}
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

            {/* TV provider selection */}
            <div className="space-y-2">
              <Label htmlFor="provider-select">TV Provider</Label>
              <Select value={provider} onValueChange={setProvider} disabled={loadingProviders}>
                <SelectTrigger id="provider-select">
                  <SelectValue placeholder={loadingProviders ? "Loading..." : "Select provider"} />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(p => (
                    <SelectItem key={p.serviceID} value={p.serviceID}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Smart card input and verification status */}
            <div className="space-y-2">
              <Label htmlFor="smart-card-input">Smart Card / IUC Number</Label>
              <Input
                id="smart-card-input"
                type="text"
                placeholder={provider ? `Enter ${getSmartCardLength(provider).join(" or ")}-digit card number` : "Select a TV Provider first"}
                value={smartCardNumber}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "")
                  setSmartCardNumber(v)
                  setVerificationError("")
                  setVerificationSuccess(false)
                  setCustomerName("")
                  setCurrentBouquet("")
                  setDueDate("")
                  setRenewalAmount("")
                }}
                maxLength={12}
                disabled={!provider}
              />
              {verifyingCard && (
                <div className="flex items-center space-x-2 text-sm text-blue-600 mt-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying card…</span>
                </div>
              )}
              {verificationSuccess && (
                <div className="flex items-center space-x-2 text-sm text-green-600 mt-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Card verified</span>
                </div>
              )}
              {verificationError && (
                <div className="flex items-center space-x-2 text-sm text-red-600 mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{verificationError}</span>
                </div>
              )}
            </div>

            {/* Customer details - conditionally rendered after verification */}
            {verificationSuccess && (
              <>
                {customerName && (
                  <div className="space-y-2">
                    <Label>Customer Name</Label>
                    <Input value={customerName} readOnly className="bg-green-50 text-black" />
                  </div>
                )}
                {currentBouquet && (
                  <div className="space-y-2">
                    <Label>Current Bouquet</Label>
                    <Input value={currentBouquet} readOnly className="bg-green-50 text-black" />
                  </div>
                )}
                {dueDate && (
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input value={dueDate} readOnly className="bg-green-50 text-black" />
                  </div>
                )}
                {renewalAmount && (
                  <div className="space-y-2">
                    <Label>Renewal Amount</Label>
                    <Input value={`₦${Number(renewalAmount).toLocaleString()}`} readOnly className="bg-green-50 text-black" />
                  </div>
                )}
              </>
            )}

            {/* Subscription plan selection - only visible after successful verification */}
            {verificationSuccess && (
              <div className="space-y-2">
                <Label htmlFor="plan-select">Subscription Plan</Label>
                <Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
                  <SelectTrigger id="plan-select">
                    <SelectValue placeholder={loadingPlans ? "Loading..." : "Select plan"} />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(p => (
                      <SelectItem key={p.variation_code} value={p.variation_code}>
                        {p.name} - ₦{Number(p.variation_amount).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Compulsory token approval info */}
            {selectedCrypto && (
              <div className="text-sm p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-700">
                    Token approval required for all ERC20 transactions
                  </span>
                </div>
              </div>
            )}

            {/* Summary section */}
            <div className="border-t pt-4 space-y-2 text-sm">
              {requestId && (
                <div className="flex justify-between">
                  <span>Request ID:</span>
                  <span className="font-mono text-xs">{requestId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Conversion Rate:</span>
                <span>
                  {selectedCrypto && priceNGN
                    ? `₦${priceNGN.toLocaleString()} / 1 ${selectedCrypto.symbol}`
                    : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Subscription Amount:</span>
                <span>₦{amountNGN.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>You will pay:</span>
                <span>
                  {selectedCrypto && selectedPlan && priceNGN ? (
                    <Badge variant="outline">
                      {cryptoNeeded.toFixed(selectedCrypto?.decimals || 6)} {selectedCrypto.symbol}
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
              txStatus === 'waitingForApprovalSignature' ? "Awaiting Approval Signature..." :
              txStatus === 'approving' ? "Approving Token..." :
              txStatus === 'approvalSuccess' ? "Approval Complete - Starting Payment..." :
              txStatus === 'waitingForSignature' ? "Awaiting Payment Signature..." :
              txStatus === 'sending' ? "Sending Payment..." :
              txStatus === 'confirming' ? "Confirming Payment..." :
              txStatus === 'success' ? "Payment Confirmed!" :
              txStatus === 'backendProcessing' ? "Processing Order..." :
              txStatus === 'backendSuccess' ? "TV Subscription Successful!" :
              txStatus === 'backendError' ? "Payment Failed - Try Again" :
              txStatus === 'error' ? "Transaction Failed - Try Again" :
              canPay ? "Approve & Pay TV Subscription" :
              "Complete form and verify card"}
            </Button>

            {/* Active tokens info */}
            {activeTokens.length > 0 && (
              <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                <p className="font-medium mb-1">Active ERC20 Tokens ({activeTokens.length}):</p>
                <p>{activeTokens.map(t => t.symbol).join(", ")}</p>
              </div>
            )}

            {/* Transaction flow info */}
            <div className="text-xs text-muted-foreground p-3 bg-blue-50 rounded-lg">
              <p className="font-medium mb-1">Transaction Flow:</p>
              <p>1. Token Approval → 2. Payment Transaction → 3. Order Processing</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <TransactionStatusModal
        isOpen={showTransactionModal}
        onClose={handleCloseModal}
        txStatus={txStatus}
        transactionHash={transactionHashForModal}
        errorMessage={transactionError}
        backendMessage={backendMessage}
        requestId={requestId}
      />
    </AuthGuard>
  )
}