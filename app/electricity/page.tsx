// app/electricity/page.tsx
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

import { paycryptOnchain } from "@/lib/paycryptOnchain";
import { ERC20_ABI } from "@/config/erc20Abi";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'; // Removed useSimulateContract
import { usePrivy } from '@privy-io/react-auth';
import { parseUnits, toBytes, toHex, Hex, fromHex } from 'viem'; // Added fromHex
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";
import { useBaseNetworkEnforcer } from '@/hooks/useBaseNetworkEnforcer';

import { payElectricityBill } from "@/lib/api";
import { TokenConfig } from "@/lib/tokenlist"; // Assuming TokenConfig is available
import { fetchActiveTokensWithMetadata } from "@/lib/tokenUtils"; // Assuming fetchActiveTokensWithMetadata is available

import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";

// Dynamic ERC20 token list from contract
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

// Fetch prices for dynamic tokens
async function fetchPrices(tokenList: TokenConfig[]): Promise<Record<string, any>> {
  if (!tokenList || tokenList.length === 0) return {};
  const ids = tokenList.map(c => c.coingeckoId).join(",");
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`);
  return res.ok ? await res.json() : {};
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
  const [activeTokens, setActiveTokens] = useState<TokenConfig[]>([]); // Dynamic ERC20 tokens from contract
  const [selectedToken, setSelectedToken] = useState<string>(""); // Selected token address
  const [provider, setProvider] = useState("");
  const [plan, setPlan] = useState("");
  const [amount, setAmount] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [plans, setPlans] = useState<ElectricityPlan[]>([]);
  const [prices, setPrices] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [verifyingMeter, setVerifyingMeter] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string | undefined>(undefined);
  const [phone, setPhone] = useState("");

  const [txStatus, setTxStatus] = useState<'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' | 'backendProcessing' | 'backendSuccess' | 'backendError' | 'waitingForApprovalSignature' | 'approving' | 'approvalSuccess' | 'approvalError'>('idle');
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);

  const [approvalError, setApprovalError] = useState<string | null>(null);
  const backendRequestSentRef = useRef<Hex | null>(null);

  const { connectWallet, authenticated, user } = usePrivy();
  const { isConnected, address } = useAccount();

  const { isOnBaseChain, isSwitchingChain, promptSwitchToBase } = useBaseNetworkEnforcer();

  // Initial load: fetch active tokens and prices
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
    if ((selectedToken || provider || plan || meterNumber || amount || phone) && !requestId) {
        setRequestId(generateRequestId());
    } else if (!(selectedToken || provider || plan || meterNumber || amount || phone) && requestId) {
        setRequestId(undefined);
    }
  }, [selectedToken, provider, plan, meterNumber, amount, phone, requestId]);


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


  // Derived values for selected token
  const selectedTokenObj = activeTokens.find(t => t.address === selectedToken);
  const priceNGN = selectedTokenObj ? prices[selectedTokenObj.coingeckoId]?.ngn : null;
  const amountNGN = Number(amount) || 0;
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0;
  const tokenAmountForOrder: bigint = selectedTokenObj ? parseUnits(cryptoNeeded.toFixed(selectedTokenObj.decimals), selectedTokenObj.decimals) : BigInt(0);
  const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 });
  const unlimitedApprovalAmount: bigint = parseUnits('115792089237316195423570985008687907853269984665640564039457584007913129639935', 0);
  // ETH is not supported, so valueForEth will always be BigInt(0)
  const valueForEth: bigint = BigInt(0);

  // Check current allowance for ERC20 tokens
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: selectedTokenObj?.address as Hex,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as Hex, CONTRACT_ADDRESS],
    query: {
      enabled: Boolean(selectedTokenObj?.address && address && selectedTokenObj?.tokenType !== 0),
    },
  });

  const [needsApproval, setNeedsApproval] = useState(false);
  // Check if approval is needed
  useEffect(() => {
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
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending, isError: isApproveError, error: approveWriteError, reset: resetApprove } = useWriteContract();
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalTxConfirmed, isError: isApprovalConfirmError, error: approveConfirmError } = useWaitForTransactionReceipt({
    hash: approveHash as Hex,
    query: { enabled: Boolean(approveHash), refetchInterval: 1000 },
  });

  // Wagmi Hooks for MAIN PAYMENT Transaction
  const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
    hash: hash as Hex,
    query: { enabled: Boolean(hash), refetchInterval: 1000 },
  });

  // Check if requestId is already used
  const { data: existingOrder } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getOrder',
    args: [fromHex(bytes32RequestId, 'bigint')], // Converted Hex to BigInt for getOrder
    query: { enabled: Boolean(requestId && address) },
  });

  // Moved handlePostTransaction definition above its usage in useEffect
  const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
    if (backendRequestSentRef.current === transactionHash) {
      console.log(`Backend request already sent for hash: ${transactionHash}. Skipping duplicate.`);
      return;
    }
    try {
      setTxStatus('sending');
      await paycryptOnchain({
        userAddress: address!,
        tokenAddress: selectedTokenObj ? selectedTokenObj.contract ?? CONTRACT_ADDRESS : CONTRACT_ADDRESS,
        amount: tokenAmountForOrder,
        requestId: bytes32RequestId,
        walletClient: undefined,
        publicClient: undefined,
      });
      setTxStatus('success');
    } catch (err: any) {
      setTxStatus('error');
      setTransactionError(err.message || 'Onchain payment failed');
      toast.error(err.message || 'Onchain payment failed', { id: 'backend-status' });
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
        cryptoUsed: parseFloat(cryptoNeeded.toFixed(selectedTokenObj?.decimals || 6)),
        cryptoSymbol: selectedTokenObj?.symbol!,
        transactionHash,
        userAddress: address!
      });
      setTxStatus('backendSuccess');
      setBackendMessage("Electricity bill paid successfully!");
      toast.success("Electricity bill paid successfully!", { id: 'backend-status' });
      setSelectedToken("");
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
  }, [requestId, meterNumber, provider, plan, amountNGN, phone, cryptoNeeded, selectedTokenObj?.symbol, selectedTokenObj?.decimals, address, selectedTokenObj?.contract, tokenAmountForOrder, bytes32RequestId]);

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

        // Trigger main transaction after approval success
        if (selectedTokenObj && selectedTokenObj.tokenType !== 0) {
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
                          toHex(BigInt(selectedTokenObj.tokenType), { size: 32 }), // Converted number to BigInt then to Hex for bytes32
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
        }
    } else if (isApproveError || isApprovalConfirmError) {
        setTxStatus('approvalError');
        const errorMsg = (approveWriteError?.message || approveConfirmError?.message || "Token approval failed").split('\n')[0];
        setApprovalError(errorMsg);
        setTransactionError(errorMsg); // Use main error state for modal display
        toast.error(`Approval failed: ${errorMsg}`, { id: 'approval-status' });
    }
  }, [isApprovePending, approveHash, isApprovalTxConfirmed, isApprovalConfirming, isApproveError, isApprovalConfirmError, approveWriteError, approveConfirmError, showTransactionModal, selectedTokenObj, bytes32RequestId, tokenAmountForOrder, writeContract]);

  // Effect to monitor main transaction status
  useEffect(() => {
    if (!showTransactionModal) return; // Only run if modal is open
    // Only run if not currently in an approval flow (or just finished with approval error)
    if (['waitingForApprovalSignature', 'approving', 'approvalSuccess', 'approvalError'].includes(txStatus)) {
        return;
    }

    // Handle immediate writeContract errors (e.g., user rejected)
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
    setShowTransactionModal(true);
    setTransactionError(null);
    setBackendMessage(null);
    setApprovalError(null);
    setTxStatus('idle');
    backendRequestSentRef.current = null;

    const walletConnectedAndOnBase = await ensureWalletConnected();
    if (!walletConnectedAndOnBase) {
      setTxStatus('idle');
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
      toast.error("Please verify meter number before proceeding with purchase.");
      setTxStatus('error');
      return;
    }
    if (amountNGN <= 0) {
      toast.error("Please enter a valid amount.");
      setTxStatus('error');
      return;
    }
    if (!selectedTokenObj) {
      toast.error("Please select a token.");
      setTxStatus('error');
      return;
    }
    // Debugging logs for contract call parameters
    console.log("--- Initiating Contract Call ---");
    console.log("RequestId (bytes32):", bytes32RequestId);
    console.log("TokenType:", selectedTokenObj.tokenType);
    console.log("TokenAmount for Order (parsed):", tokenAmountForOrder.toString());
    console.log("Selected Token:", selectedTokenObj.symbol);
    console.log("Crypto Needed (float):", cryptoNeeded);
    console.log("Selected Token Decimals:", selectedTokenObj.decimals);
    console.log("--------------------------------");
    if (existingOrder && existingOrder.user && existingOrder.user !== '0x0000000000000000000000000000000000000000') {
      toast.error('Order already exists for this request. Please refresh and try again.');
      setRequestId(generateRequestId());
      return;
    }
    if (typeof tokenAmountForOrder === "bigint" ? tokenAmountForOrder === BigInt(0) : tokenAmountForOrder === 0) {
      toast.error('Amount too low. Please enter a valid amount.');
      setRequestId(generateRequestId());
      return;
    }
    
    // ERC20 only
    if (!selectedTokenObj.address) {
      toast.error("Selected token has no contract address for approval.");
      setTxStatus('error');
      return;
    }

    // Handle approval or direct transaction
    if (needsApproval) {
      toast.info("Approving token spend for this transaction...");
      setTxStatus('waitingForApprovalSignature');
      try {
        writeApprove({
          address: selectedTokenObj.address as Hex,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS, unlimitedApprovalAmount],
        });
        return;
      } catch (error: any) {
        console.error("Error sending approval transaction:", error);
        const errorMsg = error.message || "Failed to send approval transaction.";
        setApprovalError(errorMsg);
        setTransactionError(errorMsg);
        setTxStatus('approvalError');
        toast.error(errorMsg);
        return;
      }
    } else {
      // No approval needed, proceed with main transaction
      try {
        setTxStatus('waitingForSignature');
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'createOrder',
            args: [
                bytes32RequestId,
                toHex(BigInt(selectedTokenObj.tokenType), { size: 32 }), // Converted number to BigInt then to Hex for bytes32
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
    selectedToken &&
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
        <h1 className="text-3xl font-bold mb-4">Pay Electricity Bill</h1>
        <p className="text-muted-foreground mb-8">
          Pay your electricity bills using supported cryptocurrencies on Base chain.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Crypto to Electricity Payment</CardTitle>
            <CardDescription>
              Preview and calculate your electricity bill payment with crypto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* token selection - dynamic from contract */}
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
                    activeTokens.map(t => (
                      <SelectItem key={t.address} value={t.address}>
                        {t.symbol} - {t.name}
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
                  {cryptoNeeded > 0 && selectedTokenObj ? (
                    <Badge variant="outline">
                      {cryptoNeeded.toFixed(selectedTokenObj?.decimals || 6)} {selectedTokenObj.symbol}
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
                disabled={isButtonDisabled}
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
                canPay ? (needsApproval ? "Approve & Pay Electricity Bill" : "Pay Electricity Bill") :
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
