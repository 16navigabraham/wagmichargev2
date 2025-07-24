// app/electricity/page.tsx
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
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSimulateContract } from 'wagmi'; // Removed useSimulateContract
import { usePrivy } from '@privy-io/react-auth';
import { parseEther, parseUnits, toBytes, toHex, Hex } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";
import { useBaseNetworkEnforcer } from '@/hooks/useBaseNetworkEnforcer'; // Import the network enforcer hook

import { payElectricityBill } from "@/lib/api";

// Base chain contract addresses (ensure these are correct for Base Mainnet)
const USDT_CONTRACT_ADDRESS = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"; // Replace with actual USDT contract on Base
const USDC_CONTRACT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Replace with actual USDC contract on Base

const CRYPTOS = [
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", tokenType: 0, decimals: 18, contract: undefined },
  { symbol: "USDT", name: "Tether", coingeckoId: "tether", tokenType: 1, decimals: 6, contract: USDT_CONTRACT_ADDRESS },
  { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", tokenType: 2, decimals: 6, contract: USDC_CONTRACT_ADDRESS },
]

const ELECTRICITY_PROVIDERS = [
  { serviceID: "ikeja-electric", name: "Ikeja Electric" },
  { serviceID: "eko-electric", name: "Eko Electric" },
  { serviceID: "kano-electric", name: "Kano Electric" },
  { serviceID: "portharcourt-electric", name: "Port Harcourt Electric" },
  { serviceID: "jos-electric", name: "Jos Electric" },
  { serviceID: "ibadan-electric", name: "Ibadan Electric" },
  { serviceID: "kaduna-electric", name: "Kaduna Electric" },
  { serviceID: "abuja-electric", name: "Abuja Electric" },
  { serviceID: "enugu-electric", name: "Enugu Electric (EEDC)" },
  { serviceID: "benin-electric", name: "Benin Electric" },
  { serviceID: "aba-electric", name: "Aba Electric" },
  { serviceID: "yola-electric", name: "Yola Electric" },
]

interface ElectricityPlan {
  variation_code: string
  name: string
}

const METER_LENGTHS: Record<string, number[]> = {
  prepaid: [11],
  postpaid: [10, 11, 13],
  default: [10, 11, 12, 13],
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

async function fetchElectricityPlans(serviceID: string) {
  const res = await fetch(`/api/vtpass/service-variations?serviceID=${serviceID}`)
  const data = res.ok ? await res.json() : {}
  return data.content?.variations || []
}

/* ---------- VTpass verify - NOW USES YOUR LOCAL API ROUTE ---------- */
async function verifyMeter(billersCode: string, serviceID: string, type: string) {
  const res = await fetch("/api/vtpass/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ billersCode, serviceID, type }),
  })

  const data = await res.json()

  if (data.success) {
    return data.data || {};
  } else {
    throw new Error(data.error || "Verification failed");
  }
}

function getMeterLength(planCode: string): number[] {
  const lc = planCode.toLowerCase()
  if (lc.includes("prepaid")) return METER_LENGTHS.prepaid
  if (lc.includes("postpaid")) return METER_LENGTHS.postpaid
  return METER_LENGTHS.default
}

export default function ElectricityPage() {
  const [crypto, setCrypto] = useState("")
  const [provider, setProvider] = useState("")
  const [plan, setPlan] = useState("") // This now holds the variation_code for meter type (e.g., "prepaid", "postpaid")
  const [amount, setAmount] = useState("")
  const [meterNumber, setMeterNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [plans, setPlans] = useState<ElectricityPlan[]>([]) // These are the meter types (prepaid/postpaid)
  const [prices, setPrices] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [verifyingMeter, setVerifyingMeter] = useState(false)
  const [verificationError, setVerificationError] = useState("")
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const [requestId, setRequestId] = useState<string | undefined>(undefined);
  const [phone, setPhone] = useState("");

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
    fetchPrices().then(setPrices).finally(() => setLoading(false))
  }, [])

  /* plans when provider changes */
  useEffect(() => {
    if (!provider) {
        setPlans([]);
        setPlan("");
        return;
    }
    setLoadingPlans(true)
    fetchElectricityPlans(provider).then(setPlans).finally(() => setLoadingPlans(false))
  }, [provider])

  /* requestId generator */
  useEffect(() => {
    if ((crypto || provider || plan || meterNumber || amount || phone) && !requestId) {
        setRequestId(generateRequestId());
    } else if (!(crypto || provider || plan || meterNumber || amount || phone) && requestId) {
        setRequestId(undefined);
    }
  }, [crypto, provider, plan, meterNumber, amount, phone, requestId]);


  /* auto-verify meter */
  useEffect(() => {
    if (!provider || !plan || !meterNumber) {
      setCustomerName("")
      setCustomerAddress("")
      setVerificationError("")
      setVerificationSuccess(false)
      return
    }

    const validLengths = getMeterLength(plan)
    if (!validLengths.includes(meterNumber.length)) {
      setCustomerName("")
      setCustomerAddress("")
      setVerificationError(`Please enter a valid ${validLengths.join(" or ")} digit meter number for ${ELECTRICITY_PROVIDERS.find(p => p.serviceID === provider)?.name || 'this provider'}.`)
      setVerificationSuccess(false)
      return
    }

    const id = setTimeout(async () => {
      setVerifyingMeter(true)
      setVerificationError("")
      setVerificationSuccess(false)
      setCustomerName("")
      setCustomerAddress("")

      try {
        const content = await verifyMeter(meterNumber, provider, plan) // Pass 'plan' as type

        const name    = String(content?.Customer_Name || "").trim()
        const address = String(content?.Customer_Address || "").trim()

        if (!name) throw new Error("Customer name not found. Please check the meter number.")

        setCustomerName(name)
        setCustomerAddress(address)
        setVerificationSuccess(true)
      } catch (err: any) {
        setVerificationError(err.message || "Verification failed. Please try again.")
      } finally {
        setVerifyingMeter(false)
      }
    }, 700)
    return () => clearTimeout(id)
  }, [meterNumber, provider, plan])

  /* derived values */
  const selectedCrypto = CRYPTOS.find(c => c.symbol === crypto)
  const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
  const amountNGN = Number(amount) || 0
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0

  // For the main contract call, use the exact amount needed.
  // FIX: Use selectedCrypto.decimals for toFixed to ensure correct precision
  const tokenAmountForOrder = selectedCrypto ? parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals) : BigInt(0);
  const valueForEth = selectedCrypto?.symbol === 'ETH' && cryptoNeeded > 0
      ? parseEther(cryptoNeeded.toFixed(18)) // ETH needs full 18 decimals for parseEther
      : BigInt(0);
  const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 });

  // For approval, use the maximum uint256 value for unlimited approval.
  const unlimitedApprovalAmount = parseUnits('115792089237316195423570985008687907853269984665640564039457584007913129639935', 0);

  // Wagmi Hooks for TOKEN APPROVAL Transaction (no simulation)
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending, isError: isApproveError, error: approveWriteError } = useWriteContract();

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalTxConfirmed, isError: isApprovalConfirmError, error: approveConfirmError } = useWaitForTransactionReceipt({
      hash: approveHash as Hex,
      query: {
          enabled: Boolean(approveHash),
          refetchInterval: 1000,
      },
  });

  // Wagmi Hooks for MAIN PAYMENT Transaction (no simulation)
  const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
    hash: hash as Hex,
    query: {
      enabled: Boolean(hash),
      refetchInterval: 1000,
    },
  });

  // FIX 1: Check if requestId is already used
  const { data: existingOrder } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getOrder',
    args: [bytes32RequestId],
    query: { enabled: Boolean(requestId && address) },
  });

  // FIX 4: Simulate main contract transaction
  const { data: mainSimulation, error: mainSimError } = useSimulateContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'createOrder',
    args: [bytes32RequestId, selectedCrypto?.tokenType ?? 0, tokenAmountForOrder],
    value: selectedCrypto?.tokenType === 0 ? valueForEth : 0n,
    query: { enabled: Boolean(requestId && address && tokenAmountForOrder > 0n) },
  });

  // Moved handlePostTransaction definition above its usage in useEffect
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
    const response = await payElectricityBill({
      requestId: requestId!,
      meter_number: meterNumber,
      serviceID: provider,
      variation_code: plan,
      amount: amountNGN,
      phone,
      cryptoUsed: parseFloat(cryptoNeeded.toFixed(selectedCrypto?.decimals || 6)),
      cryptoSymbol: selectedCrypto?.symbol!,
      transactionHash,
      userAddress: address!
    });

    console.log('Backend success response:', response);
    setTxStatus('backendSuccess');
    setBackendMessage("Electricity bill paid successfully!");
    toast.success("Electricity bill paid successfully!", { id: 'backend-status' });

    setCrypto("");
    setProvider("");
    setPlan("");
    setAmount("");
    setMeterNumber("");
    setCustomerName("");
    setCustomerAddress("");
    setVerificationSuccess(false);
    setRequestId(undefined);
    setPhone("");
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
}, [requestId, meterNumber, provider, plan, amountNGN, phone, cryptoNeeded, selectedCrypto?.symbol, selectedCrypto?.decimals, address]);

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
        setTransactionHashForModal(approveHash); // Show approval hash in modal
        toast.loading("Token approval sent, waiting for confirmation...", { id: 'approval-status' });
    } else if (isApprovalConfirming) {
        setTxStatus('approving'); // Use 'approving' when it's actively confirming
        setTransactionHashForModal(approveHash);
        toast.loading("Token approval confirming on blockchain...", { id: 'approval-status' });
    } else if (isApprovalTxConfirmed) {
        setTxStatus('approvalSuccess');
        setApprovalError(null); // Clear any previous approval errors
        toast.success("Token approved for unlimited spending! Proceeding with payment...", { id: 'approval-status' }); // Updated message
        console.log("Approval: Blockchain confirmed! Initiating main transaction...");

        // The main transaction will be initiated by the simulateWriteData hook re-enabling
        // and handlePurchase being called after its data is ready.
    } else if (isApproveError || isApprovalConfirmError) {
        setTxStatus('approvalError');
        const errorMsg = (approveWriteError?.message || approveConfirmError?.message || "Token approval failed").split('\n')[0];
        setApprovalError(errorMsg);
        setTransactionError(errorMsg); // Use main error state for modal display
        toast.error(`Approval failed: ${errorMsg}`, { id: 'approval-status' });
    }
  }, [isApprovePending, approveHash, isApprovalTxConfirmed, isApprovalConfirming, isApproveError, isApprovalConfirmError, approveWriteError, approveConfirmError, showTransactionModal]);

  // Effect to monitor main transaction status
  useEffect(() => {
    if (!showTransactionModal) return; // Only run if modal is open
    // Only run if not currently in an approval flow (or just finished with approval error)
    if (['waitingForApprovalSignature', 'approving', 'approvalSuccess', 'approvalError'].includes(txStatus)) {
        return;
    }

    // Handle immediate writeContract errors (e.g., user rejected, simulation failed)
    if (isWriteError) {
        setTxStatus('error');
        const errorMsg = writeError?.message?.split('\n')[0] || "Wallet transaction failed or was rejected.";
        setTransactionError(errorMsg);
        toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
        return; // Exit early if there's a write error
    }

    if (isWritePending) {
        setTxStatus('waitingForSignature');
        setTransactionHashForModal(undefined); // Clear main tx hash
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
        setTransactionHashForModal(hash); // Ensure hash is shown during confirming
        toast.loading("Transaction confirming on blockchain...", { id: 'tx-status' });
    } else if (isConfirmed) {
        // FIX: Add a guard to ensure handlePostTransaction is called only once per confirmed hash
        if (txStatus !== 'backendProcessing' && txStatus !== 'backendSuccess' && txStatus !== 'backendError') {
            setTxStatus('success');
            setTransactionHashForModal(hash); // Ensure hash is shown during success
            toast.success("Blockchain transaction confirmed! Processing order...", { id: 'tx-status' });
            if (hash) {
                handlePostTransaction(hash);
            }
        }
    } else if (isConfirmError) { // Handle errors during transaction receipt
        setTxStatus('error');
        const errorMsg = confirmError?.message?.split('\n')[0] || "Blockchain transaction failed to confirm.";
        setTransactionError(errorMsg);
        setTransactionHashForModal(hash); // Show hash for failed tx
        toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
    } else {
        // If no active transaction state, and not in an approval flow, reset to idle
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
      setTxStatus('idle');
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
      toast.error("Please verify meter number before proceeding with purchase.");
      setTxStatus('error');
      return;
    }
    if (amountNGN <= 0) {
        toast.error("Please enter a valid amount.");
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

    if (selectedCrypto.tokenType !== 0) { // If it's an ERC20 token (USDT or USDC)
        if (!selectedCrypto.contract) {
            toast.error("Selected crypto has no contract address for approval.");
            setTxStatus('error');
            return;
        }
        
        toast.info("Approving token spend for this transaction...");
        setTxStatus('waitingForApprovalSignature'); // Set initial status for approval
        try {
            writeApprove({
                address: selectedCrypto.contract as Hex,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [CONTRACT_ADDRESS, unlimitedApprovalAmount],
            });
            return; // After initiating approval, stop here. The approval useEffect will handle next steps.
        } catch (error: any) {
            console.error("Error sending approval transaction:", error);
            const errorMsg = error.message || "Failed to send approval transaction.";
            setApprovalError(errorMsg);
            setTransactionError(errorMsg); // Propagate to main error state for modal
            setTxStatus('approvalError');
            toast.error(errorMsg);
            return;
        }
    } else {
        // If ETH, no approval needed, proceed directly with main transaction
        try {
          setTxStatus('waitingForSignature'); // Set status for main transaction signature
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
          console.error("Error sending main transaction:", error);
          const errorMsg = error.message || "Failed to send transaction.";
          setTransactionError(errorMsg);
          setTxStatus('error');
          toast.error(errorMsg);
        }
    }

    // FIX 5: Regenerate requestId after each transaction attempt
    setRequestId(generateRequestId());
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
    meterNumber &&
    amount &&
    amountNGN >= 100 &&
    phone &&
    priceNGN &&
    requestId &&
    customerName &&
    verificationSuccess;

  // Updated isButtonDisabled logic - removed simulation checks
  const isButtonDisabled = loading || loadingPlans || verifyingMeter ||
                           isWritePending || isConfirming || txStatus === 'backendProcessing' || !canPay ||
                           isApprovePending || isApprovalConfirming ||
                           !isOnBaseChain || isSwitchingChain; // Disable if not on Base or switching

  if (loading) return <div className="p-10 text-center">Loading…</div>

  return (
    <AuthGuard>
      <div className="container py-10 max-w-xl mx-auto">
        <BackToDashboard />
        <h1 className="text-3xl font-bold mb-4">Pay Electricity Bill</h1>
        <p className="text-muted-foreground mb-8">
          Pay your electricity bills using USDT, USDC, or ETH on Base chain.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Crypto to Electricity Payment</CardTitle>
            <CardDescription>
              Preview and calculate your electricity bill payment with crypto
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

            {/* provider */}
            <div className="space-y-2">
              <Label htmlFor="provider-select">Electricity Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger id="provider-select">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {ELECTRICITY_PROVIDERS.map(p => (
                    <SelectItem key={p.serviceID} value={p.serviceID}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* meter type */}
            <div className="space-y-2">
              <Label htmlFor="meter-type-select">Meter Type</Label>
              <Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
                <SelectTrigger id="meter-type-select">
                  <SelectValue placeholder={loadingPlans ? "Loading..." : "Select type"} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.variation_code} value={p.variation_code}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* meter number */}
            <div className="space-y-2">
              <Label htmlFor="meter-number-input">Meter Number</Label>
              <Input
                id="meter-number-input"
                type="text"
                placeholder={plan ? `Enter ${getMeterLength(plan).join(" or ")}-digit meter number` : "Select a Meter Type first"}
                value={meterNumber}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, "")
                  setMeterNumber(v)
                  setVerificationError("")
                  setVerificationSuccess(false)
                  setCustomerName("")
                  setCustomerAddress("")
                }}
                maxLength={plan ? Math.max(...getMeterLength(plan)) : undefined} 
                disabled={!plan}
              />
              {verifyingMeter && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying meter…</span>
                </div>
              )}
              {verificationSuccess && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Meter verified</span>
                </div>
              )}
              {verificationError && (
                <div className="flex items-center space-x-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{verificationError}</span>
                </div>
              )}
            </div>

            {/* customer details */}
            {customerName && (
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input value={customerName} readOnly className="bg-green-50 text-black" />
              </div>
            )}
            {customerAddress && (
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={customerAddress} readOnly className="bg-green-50 text-black" />
              </div>
            )}

            {/* amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (NGN)</Label>
              <Input
                id="amount"
                type="number"
                min={100}
                max={50000}
                placeholder="Enter amount in Naira, minimum ₦100"
                value={amount}
                onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || val === "0") {
                        setAmount("");
                    } else {
                        setAmount(String(Math.max(0, parseInt(val))));
                    }
                }}
              />
            </div>
            {/* Phone Number for Electricity - it's in your code, keeping it */}
            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (for token/receipt)</Label>
                <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. 080*********"
                    maxLength={11}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>

            <div className="border-t pt-4 space-y-2">
              {requestId && (
                <div className="flex justify-between text-sm">
                  <span>Request ID:</span>
                  <span className="text-muted-foreground font-mono text-xs">{requestId}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Amount (NGN):</span>
                <span>
                  {amountNGN > 0 ? `₦${amountNGN.toLocaleString()}` : "--"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>You will pay:</span>
                <span>
                  {cryptoNeeded > 0 && selectedCrypto ? (
                    <Badge variant="outline">
                      {cryptoNeeded.toFixed(selectedCrypto?.decimals || 6)} {selectedCrypto.symbol} {/* Adjusted toFixed for display */}
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
                txStatus === 'error' ? "Blockchain Failed - Try Again" :
                canPay ? "Pay Electricity Bill" :
                "Fill all details and verify meter"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <TransactionStatusModal
        isOpen={showTransactionModal}
        onClose={handleCloseModal}
        txStatus={txStatus}
        transactionHash={transactionHashForModal}
        errorMessage={transactionError || approvalError }
        backendMessage={backendMessage}
        requestId={requestId}
      />
    </AuthGuard>
  )
}
