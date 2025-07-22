// app/tv/page.tsx
"use client"
import { useState, useEffect, useCallback, useRef } from "react" // Added useRef
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
import { ERC20_ABI } from "@/config/erc20Abi"; // Import ERC20 ABI
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSimulateContract } from 'wagmi'; // Added useSimulateContract
import { usePrivy } from '@privy-io/react-auth';
import { parseEther, parseUnits, toBytes, toHex, Hex } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";
import { useBaseNetworkEnforcer } from '@/hooks/useBaseNetworkEnforcer'; // Import the network enforcer hook

// Base chain contract addresses (ensure these are correct for Base Mainnet)
const USDT_CONTRACT_ADDRESS = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"; // Replace with actual USDT contract on Base
const USDC_CONTRACT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Corrected USDC contract address for consistency

const CRYPTOS = [
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", tokenType: 0, decimals: 18, contract: undefined }, // ETH has no contract address
  { symbol: "USDT", name: "Tether", coingeckoId: "tether", tokenType: 1, decimals: 6, contract: USDT_CONTRACT_ADDRESS },
  { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", tokenType: 2, decimals: 6, contract: USDC_CONTRACT_ADDRESS },
]

interface TVProvider {
  serviceID: string
  name: string
}
interface TVPlan {
  variation_code: string
  name: string
  variation_amount: string
  // fixedPrice: string // Added fixedPrice to match the structure from electricity/internet
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
async function fetchPrices() {
  const ids = CRYPTOS.map(c => c.coingeckoId).join(",")
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`)
  return res.ok ? await res.json() : {}
}

async function fetchTVProviders() {
  const res = await fetch("/api/vtpass/services?identifier=tv-subscription")
  const data = res.ok ? await res.json() : {}
  return data.content || []
}

async function fetchTVPlans(serviceID: string) {
  const res = await fetch(`/api/vtpass/service-variations?serviceID=${serviceID}`)
  const data = res.ok ? await res.json() : {}
  return data.content?.variations || []
}

/* ---------- VTpass verify - NOW USES YOUR LOCAL API ROUTE ---------- */
async function verifyCard(billersCode: string, serviceID: string) {
  const res = await fetch("/api/vtpass/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ billersCode, serviceID, type: "smartcard" }),
  })

  const data = await res.json()

  if (data.success) {
    return data.data || {};
  } else {
    throw new Error(data.error || "Verification failed");
  }
}

function getSmartCardLength(serviceID: string): number[] {
  const id = serviceID.toLowerCase()
  return SMART_CARD_LENGTHS[id] ?? SMART_CARD_LENGTHS.default
}

export default function TVPage() {
  const [crypto, setCrypto] = useState("")
  const [provider, setProvider] = useState("")
  const [plan, setPlan] = useState("")
  const [smartCardNumber, setSmartCardNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [currentBouquet, setCurrentBouquet] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [renewalAmount, setRenewalAmount] = useState("")
  const [providers, setProviders] = useState<TVProvider[]>([])
  const [plans, setPlans] = useState<TVPlan[]>([])
  const [prices, setPrices] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [verifyingCard, setVerifyingCard] = useState(false)
  const [verificationError, setVerificationError] = useState("")
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const [requestId, setRequestId] = useState<string | undefined>(undefined);

  const [txStatus, setTxStatus] = useState<'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' | 'backendProcessing' | 'backendSuccess' | 'backendError' | 'waitingForApprovalSignature' | 'approving' | 'approvalSuccess' | 'approvalError'>('idle');
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);

  const [approvalError, setApprovalError] = useState<string | null>(null);
  const backendRequestSentRef = useRef<Hex | null>(null); // Added to track if backend request has been sent

  const { connectWallet, authenticated, user } = usePrivy();
  const { isConnected, address } = useAccount();

  const { isOnBaseChain, isSwitchingChain, promptSwitchToBase } = useBaseNetworkEnforcer();

  /* initial load */
  useEffect(() => {
    Promise.all([fetchPrices(), fetchTVProviders()]).then(([p, prov]) => {
      setPrices(p)
      setProviders(prov)
      setLoading(false)
      setLoadingProviders(false)
    })
  }, [])

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
    if (crypto && provider && plan && smartCardNumber && customerName && verificationSuccess && !requestId)
      setRequestId(generateRequestId())
    else if (! (crypto && provider && plan && smartCardNumber && customerName && verificationSuccess) && requestId) {
      setRequestId(undefined)
    }
  }, [crypto, provider, plan, smartCardNumber, customerName, verificationSuccess, requestId])

  /* auto-verify card */
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

    const id = setTimeout(async () => {
      setVerifyingCard(true)
      setVerificationError("")
      setVerificationSuccess(false)
      setCustomerName("")
      setCurrentBouquet("")
      setDueDate("")
      setRenewalAmount("")

      try {
        const content = await verifyCard(smartCardNumber, provider)

        const name    = String(content?.Customer_Name || "").trim()
        const bouquet = String(content?.Current_Bouquet || "").trim()
        const due     = String(content?.Due_Date || "").trim()
        const renewal = String(content?.Renewal_Amount || "").trim()

        if (!name) throw new Error("Customer name not found. Please check the smart card number.")

        setCustomerName(name)
        setCurrentBouquet(bouquet)
        setDueDate(due)
        setRenewalAmount(renewal)
        setVerificationSuccess(true)
      } catch (err: any) {
        setVerificationError(err.message || "Verification failed. Please try again.")
      } finally {
        setVerifyingCard(false)
      }
    }, 700)
    return () => clearTimeout(id)
  }, [smartCardNumber, provider, providers])

  /* derived values */
  const selectedCrypto = CRYPTOS.find(c => c.symbol === crypto)
  const selectedPlan   = plans.find(p => p.variation_code === plan)
  const priceNGN       = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
  const amountNGN      = selectedPlan ? Number(selectedPlan.variation_amount) : 0
  const cryptoNeeded   = priceNGN && amountNGN ? amountNGN / priceNGN : 0

  // For the main contract call, use the exact amount needed.
  // FIX: Use selectedCrypto.decimals for toFixed to ensure correct precision
  const tokenAmountForOrder = selectedCrypto ? parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals) : BigInt(0);
  const valueForEth = selectedCrypto?.symbol === 'ETH' && cryptoNeeded > 0
      ? parseEther(cryptoNeeded.toFixed(18)) // ETH needs full 18 decimals for parseEther
      : BigInt(0);
  const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 });

  // For approval, use the maximum uint256 value for unlimited approval.
  const unlimitedApprovalAmount = parseUnits('115792089237316195423570985008687907853269984665640564039457584007913129639935', 0);

  // Wagmi Hooks for TOKEN APPROVAL Simulation
  const { data: simulateApproveData, error: simulateApproveError, isLoading: isSimulatingApprove } = useSimulateContract({
      address: selectedCrypto?.contract as Hex,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESS, unlimitedApprovalAmount],
      query: {
          enabled: Boolean(selectedCrypto?.tokenType !== 0 && selectedCrypto?.contract && address && isConnected && isOnBaseChain && cryptoNeeded > 0), // Only enabled if ERC20 and form is ready
          staleTime: 5000,
          gcTime: 60000,
          refetchOnWindowFocus: false,
      },
  });

  // Wagmi Hooks for TOKEN APPROVAL Transaction
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending, isError: isApproveError, error: approveWriteError } = useWriteContract();

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalTxConfirmed, isError: isApprovalConfirmError, error: approveConfirmError } = useWaitForTransactionReceipt({
      hash: approveHash as Hex,
      query: {
          enabled: Boolean(approveHash),
          refetchInterval: 1000,
      },
  });

  // Wagmi Hooks for MAIN PAYMENT Simulation
  const { data: simulateWriteData, error: simulateWriteError, isLoading: isSimulatingWrite } = useSimulateContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'createOrder',
      args: [
          bytes32RequestId,
          selectedCrypto?.tokenType as any, // Cast as any for now, ensure selectedCrypto is defined
          tokenAmountForOrder,
      ],
      value: valueForEth,
      query: {
          enabled: Boolean(selectedCrypto && requestId && cryptoNeeded > 0 && address && isConnected && isOnBaseChain && (selectedCrypto.tokenType === 0 || isApprovalTxConfirmed)), // Only simulate if ETH or after approval
          staleTime: 5000,
          gcTime: 60000,
          refetchOnWindowFocus: false,
      },
  });

  // Wagmi Hooks for MAIN PAYMENT Transaction
  const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
    hash: hash as Hex,
    query: {
      enabled: Boolean(hash),
      refetchInterval: 1000,
    },
  });

  // Moved handlePostTransaction definition above its usage in useEffect
  const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
    // Use the ref to ensure the request is sent only once for a given transactionHash
    if (backendRequestSentRef.current === transactionHash) {
        console.log(`Backend request already sent for hash: ${transactionHash}. Skipping duplicate.`);
        return;
    }

    backendRequestSentRef.current = transactionHash; // Mark this hash as processed

    setTxStatus('backendProcessing');
    setBackendMessage("Processing your order...");
    toast.loading("Processing order with VTpass...", { id: 'backend-status' });

    try {
      const backendResponse = await fetch('/api/tv', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          billersCode: smartCardNumber,
          serviceID: provider,
          variation_code: plan,
          amount: amountNGN,
          phone: smartCardNumber, // Assuming smartCardNumber can be used as phone for TV
          cryptoUsed: cryptoNeeded,
          cryptoSymbol: selectedCrypto?.symbol, // Safely access symbol
          transactionHash,
          userAddress: address // Added userAddress
        }),
      });

      // FIX: More robust JSON parsing
      let responseData;
      try {
          responseData = await backendResponse.json();
      } catch (jsonError: any) {
          const textResponse = await backendResponse.text();
          console.error("JSON parsing error:", jsonError);
          console.error("Raw backend response:", textResponse);
          throw new Error(`Backend responded with non-JSON: ${textResponse.substring(0, 100)}...`);
      }

      if (!backendResponse.ok) {
        throw new Error(responseData.message || responseData.error || "Failed to subscribe TV via backend.");
      }

      setTxStatus('backendSuccess');
      toast.success("TV subscription paid successfully!", { id: 'backend-status' });
      setBackendMessage(responseData.message || "TV subscription paid successfully!"); // Use backend message if available
      // Reset form for next transaction
      setCrypto("");
      setProvider("");
      setPlan("");
      setSmartCardNumber("");
      setCustomerName("");
      setCurrentBouquet("");
      setDueDate("");
      setRenewalAmount("");
      setVerificationError("");
      setVerificationSuccess(false);
      setRequestId(undefined);
      backendRequestSentRef.current = null; // Clear ref after successful backend processing
    } catch (backendError: any) {
      setTxStatus('backendError');
      const msg = `Backend processing failed: ${backendError.message}. Please contact support with Request ID: ${requestId}`;
      setBackendMessage(msg);
      console.error("Backend API call failed:", backendError);
      toast.error(msg, { id: 'backend-status' });
      // Do NOT clear backendRequestSentRef here to prevent re-attempts if it failed.
      // User needs to manually retry/reset.
    }
  }, [requestId, smartCardNumber, provider, plan, amountNGN, cryptoNeeded, selectedCrypto?.symbol, address]);

  // Effect to monitor approval transaction status
  useEffect(() => {
    if (!showTransactionModal) return; // Only run if modal is open

    if (isApprovePending) {
        setTxStatus('waitingForApprovalSignature');
        setTransactionHashForModal(undefined);
        setTransactionError(null);
        setBackendMessage(null);
        setApprovalError(null);
        toast.info("Awaiting token approval signature...");
        backendRequestSentRef.current = null; // Reset backend request flag on new blockchain tx initiation
    } else if (approveHash && !isApprovalTxConfirmed && !isApprovalConfirming) {
        setTxStatus('sending'); // Use 'sending' for approval hash available but not yet confirming
        setTransactionHashForModal(approveHash);
        toast.loading("Token approval sent, waiting for confirmation...", { id: 'approval-status' });
    } else if (isApprovalConfirming) {
        setTxStatus('approving'); // Use 'approving' when it's actively confirming
        setTransactionHashForModal(approveHash);
        toast.loading("Token approval confirming on blockchain...", { id: 'approval-status' });
    } else if (isApprovalTxConfirmed) {
        setTxStatus('approvalSuccess');
        setApprovalError(null);
        toast.success("Token approved for unlimited spending! Proceeding with payment...", { id: 'approval-status' });
        console.log("Approval: Blockchain confirmed! Initiating main transaction...");
        // The main transaction will be initiated by the simulateWriteData hook re-enabling
        // and handlePurchase being called after its data is ready.
    } else if (isApproveError || isApprovalConfirmError) {
        setTxStatus('approvalError');
        const errorMsg = (approveWriteError?.message || approveConfirmError?.message || simulateApproveError?.message || "Token approval failed").split('\n')[0];
        setApprovalError(errorMsg);
        setTransactionError(errorMsg); // Propagate to general transaction error for modal
        toast.error(`Approval failed: ${errorMsg}`, { id: 'approval-status' });
    }
  }, [isApprovePending, approveHash, isApprovalTxConfirmed, isApprovalConfirming, isApproveError, isApprovalConfirmError, approveWriteError, approveConfirmError, simulateApproveError, showTransactionModal]);

  // Effect to monitor main transaction status
  useEffect(() => {
    if (!showTransactionModal) return; // Only run if modal is open
    // Skip if we are in an approval flow
    if (['waitingForApprovalSignature', 'approving', 'approvalSuccess', 'approvalError'].includes(txStatus)) {
        return;
    }

    if (isWritePending) {
        setTxStatus('waitingForSignature');
        setTransactionHashForModal(undefined);
        setTransactionError(null);
        setBackendMessage(null);
        toast.info("Awaiting wallet signature...");
        backendRequestSentRef.current = null; // Reset backend request flag on new blockchain tx initiation
    } else if (hash && !isConfirmed && !isConfirming) {
        setTxStatus('sending');
        setTransactionHashForModal(hash);
        toast.loading("Transaction sent, waiting for blockchain confirmation...", { id: 'tx-status' });
    } else if (isConfirming) {
        setTxStatus('confirming');
        setTransactionHashForModal(hash);
        toast.loading("Transaction confirming on blockchain...", { id: 'tx-status' });
    } else if (isConfirmed) {
        // FIX: Add a guard to ensure handlePostTransaction is called only once per confirmed hash
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
        const errorMsg = (writeError?.message?.split('\n')[0] || confirmError?.message?.split('\n')[0] || simulateWriteError?.message?.split('\n')[0] || "Wallet transaction failed or was rejected.").split('\n')[0];
        setTransactionError(errorMsg);
        setTransactionHashForModal(hash); // Keep hash if available for error context
        toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
    } else {
        // Reset to idle if no active transaction state and modal is still open,
        // but avoid resetting if another part of the flow (like backend processing) is active
        if (!['backendProcessing', 'backendSuccess', 'backendError'].includes(txStatus)) {
            setTxStatus('idle');
            setTransactionError(null);
            setBackendMessage(null);
            setTransactionHashForModal(undefined);
        }
    }
  }, [isWritePending, hash, isConfirming, isConfirmed, isWriteError, isConfirmError, writeError, confirmError, txStatus, handlePostTransaction, simulateWriteError, showTransactionModal]);

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
    // Use the network enforcer hook
    if (!isOnBaseChain) {
        promptSwitchToBase();
        return false;
    }
    return true;
  };

  const handlePurchase = async () => {
    // FIX: Show modal immediately on purchase attempt (ONLY place to set true)
    setShowTransactionModal(true);
    setTransactionError(null);
    setBackendMessage(null);
    setApprovalError(null);
    setTxStatus('idle'); // Reset status before starting new flow
    backendRequestSentRef.current = null; // Reset for a new transaction attempt

    const walletConnectedAndOnBase = await ensureWalletConnected();
    if (!walletConnectedAndOnBase) {
      setShowTransactionModal(false); // Hide modal if initial checks fail
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

    // Ensure selectedCrypto is not undefined here
    if (!selectedCrypto) {
        toast.error("Please select a cryptocurrency.");
        setTxStatus('error');
        return;
    }

    // Debugging logs for contract call parameters
    console.log("--- Initiating Contract Call ---");
    console.log("RequestId (bytes32):", bytes32RequestId);
    console.log("TokenType:", selectedCrypto.tokenType);
    console.log("TokenAmount for Order (parsed):", tokenAmountForOrder.toString()); // Log as string to see full BigInt
    console.log("Value (for ETH, 0 for ERC20):", valueForEth.toString()); // Log as string to see full BigInt
    console.log("Selected Crypto:", selectedCrypto.symbol);
    console.log("Crypto Needed (float):", cryptoNeeded);
    console.log("Selected Crypto Decimals:", selectedCrypto.decimals);
    console.log("--------------------------------");

    // Determine if approval is needed
    if (selectedCrypto.tokenType !== 0) { // If it's an ERC20 token (USDT or USDC)
        if (simulateApproveError) {
            const errorMsg = simulateApproveError.message?.split('\n')[0] || "Token approval simulation failed.";
            setApprovalError(errorMsg);
            setTransactionError(errorMsg); // Propagate to general transaction error
            setTxStatus('approvalError');
            toast.error(`Approval simulation failed: ${errorMsg}`);
            return;
        }
        if (!simulateApproveData?.request) {
            setApprovalError("Approval simulation data not ready. Please try again.");
            setTransactionError("Approval simulation data not ready. Please try again.");
            setTxStatus('approvalError');
            toast.error("Approval simulation data not ready. Please try again.");
            return;
        }
        toast.info("Approving token spend for this transaction...");
        setTxStatus('waitingForApprovalSignature'); // Set initial status for approval
        try {
            if (selectedCrypto.contract) { // Ensure contract address exists for ERC20
                writeApprove(simulateApproveData.request);
            } else {
                toast.error("Selected crypto has no contract address for approval.");
                setTxStatus('error');
                return;
            }
            // After initiating approval, stop here. The approval useEffect will handle next steps.
        } catch (error: any) {
            console.error("Error sending approval transaction:", error);
            const errorMsg = error.message || "Failed to send approval transaction.";
            setApprovalError(errorMsg);
            setTransactionError(errorMsg); // Propagate to main error state for modal
            setTxStatus('approvalError');
            toast.error(errorMsg);
        }
    } else {
        // If ETH, no approval needed, proceed directly with main transaction
        if (simulateWriteError) {
            const errorMsg = simulateWriteError.message?.split('\n')[0] || "Transaction simulation failed.";
            setTransactionError(errorMsg);
            setTxStatus('error');
            toast.error(`Payment simulation failed: ${errorMsg}`);
            return;
        }
        if (!simulateWriteData?.request) {
            setTransactionError("Payment simulation data not ready. Please try again.");
            setTxStatus('error');
            toast.error("Payment simulation data not ready. Please try again.");
            return;
        }
        try {
          setTxStatus('waitingForSignature'); // Set status for main transaction signature
          writeContract(simulateWriteData.request);
        } catch (error: any) {
          console.error("Error sending main transaction:", error);
          const errorMsg = error.message || "Failed to send transaction.";
          setTransactionError(errorMsg);
          setTxStatus('error');
          toast.error(errorMsg);
        }
    }
  };

  // FIX: Wrapped handleCloseModal in useCallback
  const handleCloseModal = useCallback(() => {
    setShowTransactionModal(false);
    setTxStatus('idle'); // Reset status to idle when modal closes
    setTransactionError(null); // Clear any errors
    setBackendMessage(null); // Clear backend messages
    setTransactionHashForModal(undefined); // Clear hash
    setApprovalError(null); // Clear approval specific errors
    backendRequestSentRef.current = null; // Clear ref on modal close to allow new transactions
  }, []); // Empty dependency array as it doesn't depend on any changing state

  const canPay =
    crypto &&
    provider &&
    plan &&
    smartCardNumber &&
    customerName &&
    verificationSuccess &&
    priceNGN &&
    amountNGN > 0 &&
    requestId;

  // --- START OF MODIFICATIONS: Updated isButtonDisabled logic ---
  const isButtonDisabled = loading || loadingProviders || loadingPlans || verifyingCard || !canPay ||
                           isApprovePending || isApprovalConfirming || isSimulatingApprove || isSimulatingWrite || // Disable during simulation
                           isWritePending || isConfirming || txStatus === 'backendProcessing' ||
                           simulateApproveError || simulateWriteError || // Disable if simulation fails (user needs to fix input or retry)
                           !isOnBaseChain || isSwitchingChain; // Disable if not on Base or switching
  // --- END OF MODIFICATIONS ---

  if (loading) return <div className="p-10 text-center">Loading…</div>

  return (
    <AuthGuard>
      <div className="container py-10 max-w-xl mx-auto">
        <BackToDashboard />
        <h1 className="text-3xl font-bold mb-4">Pay TV Subscription</h1>
        <p className="text-muted-foreground mb-8">
          Pay for your TV subscription using USDT, USDC, or ETH on Base chain.
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
              <Select value={crypto} onValueChange={setCrypto}>
                <SelectTrigger id="crypto-select"><SelectValue placeholder="Select crypto" /></SelectTrigger>
                <SelectContent>
                  {CRYPTOS.map(c => (
                    <SelectItem key={c.symbol} value={c.symbol}>
                      {c.symbol} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {crypto && selectedPlan && priceNGN ? (
                    <Badge variant="outline">
                      {cryptoNeeded.toFixed(selectedCrypto?.decimals || 6)} {crypto} {/* Adjusted toFixed for display */}
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
                isSimulatingApprove || isSimulatingWrite ? "Simulating Transaction..." :
                simulateApproveError || simulateWriteError ? "Simulation Failed" :
                isApprovePending ? "Awaiting Approval Signature..." :
                isApprovalConfirming ? "Approving Token..." :
                txStatus === 'waitingForSignature' ? "Awaiting Payment Signature..." :
                txStatus === 'sending' ? "Sending Transaction..." :
                txStatus === 'confirming' ? "Confirming Blockchain..." :
                txStatus === 'success' ? "Blockchain Confirmed!" :
                txStatus === 'backendProcessing' ? "Processing Order..." :
                txStatus === 'backendSuccess' ? "Payment Successful!" :
                txStatus === 'backendError' ? "Payment Failed - Try Again" :
                txStatus === 'error' ? "Blockchain Failed - Try Again" :
                canPay ? "Pay TV Subscription" :
                "Complete form and verify card"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <TransactionStatusModal
        isOpen={showTransactionModal}
        onClose={handleCloseModal}
        txStatus={txStatus}
        transactionHash={transactionHashForModal}
        errorMessage={transactionError || approvalError || simulateApproveError?.message || simulateWriteError?.message}
        backendMessage={backendMessage}
        requestId={requestId}
      />
    </AuthGuard>
  )
}
