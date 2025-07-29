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
import { paycryptOnchain } from "@/lib/paycryptOnchain";
import { ERC20_ABI } from "@/config/erc20Abi";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'; // Removed useSimulateContract
import { usePrivy } from '@privy-io/react-auth';
import { parseEther, parseUnits, toBytes, toHex, Hex, fromHex } from 'viem'; // Added fromHex
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";
import { useBaseNetworkEnforcer } from '@/hooks/useBaseNetworkEnforcer';

import { payTVSubscription } from "@/lib/api";
import { TokenConfig } from "@/lib/tokenlist"; // Assuming TokenConfig is available
import { fetchActiveTokensWithMetadata } from "@/lib/tokenUtils"; // Assuming fetchActiveTokensWithMetadata is available

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

async function fetchPrices(tokenList: TokenConfig[]): Promise<Record<string, any>> { // Changed parameter type to TokenConfig[]
  const ids = tokenList.map((c: TokenConfig) => c.coingeckoId).join(",");
  if (!ids) return {};
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`);
  return res.ok ? await res.json() : {};
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
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>(""); // Changed from 'crypto' to 'selectedTokenAddress'
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

  const [activeTokens, setActiveTokens] = useState<TokenConfig[]>([]); // Changed type to TokenConfig[]

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

  /* initial load */

  // Initial load: fetch active tokens, then prices, then providers
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const tokens = await fetchActiveTokensWithMetadata(); // Using the new utility
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
        setLoadingProviders(false); // Assuming providers are loaded with tokens
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
    if ((selectedTokenAddress || provider || plan || smartCardNumber || customerName || verificationSuccess) && !requestId) // Changed 'crypto' to 'selectedTokenAddress'
      setRequestId(generateRequestId())
    else if (! (selectedTokenAddress || provider || plan || smartCardNumber || customerName || verificationSuccess) && requestId) { // Changed 'crypto' to 'selectedTokenAddress'
      setRequestId(undefined)
    }
  }, [selectedTokenAddress, provider, plan, smartCardNumber, customerName, verificationSuccess, requestId]) // Changed 'crypto' to 'selectedTokenAddress'

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


  // Derived values
  const selectedCrypto = activeTokens.find(c => c.address === selectedTokenAddress); // Changed from 'symbol' to 'address'
  const selectedPlan   = plans.find(p => p.variation_code === plan);
  const priceNGN       = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null;
  const amountNGN      = selectedPlan ? Number(selectedPlan.variation_amount) : 0;
  const cryptoNeeded   = priceNGN && amountNGN ? amountNGN / priceNGN : 0;

  // For the main contract call, use the exact amount needed.
  const tokenAmountForOrder: bigint = selectedCrypto ? parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals) : BigInt(0);
  const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 });

  // For approval, use the maximum uint256 value for unlimited approval.
  const unlimitedApprovalAmount: bigint = parseUnits('115792089237316195423570985008687907853269984665640564039457584007913129639935', 0);

  // Check current allowance for ERC20 tokens
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: selectedCrypto?.address as Hex, // Use selectedCrypto.address
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as Hex, CONTRACT_ADDRESS],
    query: {
      enabled: Boolean(selectedCrypto?.address && address && selectedCrypto?.tokenType !== 0), // Only enable if a token is selected and it's an ERC20 token
    },
  });

  const [needsApproval, setNeedsApproval] = useState(false);
  // Check if approval is needed
  useEffect(() => {
    // Approval is only relevant for ERC20 tokens (tokenType !== 0)
    if (!selectedCrypto || selectedCrypto.tokenType === 0 || !currentAllowance || !tokenAmountForOrder) {
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

  // Wagmi Hooks for TOKEN APPROVAL Transaction (removed simulation)
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending, isError: isApproveError, error: approveWriteError, reset: resetApprove } = useWriteContract(); // Added reset

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalTxConfirmed, isError: isApprovalConfirmError, error: approveConfirmError } = useWaitForTransactionReceipt({
      hash: approveHash as Hex,
      query: {
          enabled: Boolean(approveHash),
          refetchInterval: 1000,
      },
  });

  // Wagmi Hooks for MAIN PAYMENT Transaction (removed simulation)
  const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError, reset: resetWrite } = useWriteContract(); // Added reset

  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
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
    args: [fromHex(bytes32RequestId, 'bigint')], // Converted Hex to BigInt for getOrder
    query: { enabled: Boolean(requestId && address) },
  });

  // Moved handlePostTransaction definition above its usage in useEffect
  const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
  if (backendRequestSentRef.current === transactionHash) {
    console.log(`Backend request already sent for hash: ${transactionHash}. Skipping duplicate.`);
    return;
  }

  // Onchain payment logic
  try {
    setTxStatus('sending');
    await paycryptOnchain({
      userAddress: address!,
      tokenAddress: selectedCrypto ? selectedCrypto.contract ?? CONTRACT_ADDRESS : CONTRACT_ADDRESS, // Use selectedCrypto.contract
      amount: tokenAmountForOrder,
      requestId: bytes32RequestId,
      walletClient: undefined, // Provide walletClient from wagmi if needed
      publicClient: undefined, // Provide publicClient from wagmi if needed
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
  toast.loading("Processing order with VTpass...", { id: 'backend-status' });

  try {
    const response = await payTVSubscription({
      requestId: requestId!,
      smartcard_number: smartCardNumber,
      serviceID: provider,
      variation_code: plan,
      amount: amountNGN,
      phone: smartCardNumber, // Assuming phone is smartCardNumber for TV
      cryptoUsed: parseFloat(cryptoNeeded.toFixed(selectedCrypto?.decimals || 6)),
      cryptoSymbol: selectedCrypto?.symbol!, // Use selectedCrypto.symbol
      transactionHash,
      userAddress: address!
    });

    console.log('Backend success response:', response);
    setTxStatus('backendSuccess');
    setBackendMessage("TV subscription paid successfully!");
    toast.success("TV subscription paid successfully!", { id: 'backend-status' });

    setSelectedTokenAddress(""); // Reset selected token
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
}, [requestId, smartCardNumber, provider, plan, amountNGN, cryptoNeeded, selectedCrypto?.symbol, selectedCrypto?.decimals, address, selectedCrypto?.contract, tokenAmountForOrder, bytes32RequestId]); // Added dependencies

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
        setApprovalError(null); // Clear any previous approval errors
        toast.success("Token approved for unlimited spending! Proceeding with payment...", { id: 'approval-status' }); // Updated message
        console.log("Approval: Blockchain confirmed! Initiating main transaction...");
        
        // Trigger main transaction after approval success
        if (selectedCrypto && selectedCrypto.tokenType !== 0) {
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
                          toHex(BigInt(selectedCrypto.tokenType), { size: 32 }), // Converted number to BigInt then to Hex for bytes32
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

    } else if (isApproveError || isApprovalConfirmError) {
        setTxStatus('approvalError');
        const errorMsg = (approveWriteError?.message || approveConfirmError?.message || "Token approval failed").split('\n')[0];
        setApprovalError(errorMsg);
        setTransactionError(errorMsg); // Propagate to general transaction error for modal
        toast.error(`Approval failed: ${errorMsg}`, { id: 'approval-status' });
    }
  }, [isApprovePending, approveHash, isApprovalTxConfirmed, isApprovalConfirming, isApproveError, isApprovalConfirmError, approveWriteError, approveConfirmError, showTransactionModal, selectedCrypto, bytes32RequestId, tokenAmountForOrder, writeContract]); // Added dependencies

  // Effect to monitor main transaction status
  useEffect(() => {
    if (!showTransactionModal) return; // Only run if modal is open
    // Skip if we are in an approval flow
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
    console.log("Selected Crypto:", selectedCrypto.symbol);
    console.log("Crypto Needed (float):", cryptoNeeded);
    console.log("Selected Crypto Decimals:", selectedCrypto.decimals);
    console.log("--------------------------------");

    // Prevent reused requestId
    if (existingOrder && existingOrder.user && existingOrder.user !== '0x0000000000000000000000000000000000000000') {
      toast.error('Order already exists for this request. Please refresh and try again.');
      setRequestId(generateRequestId());
      return;
    }
    // Avoid zero token amount
    if (tokenAmountForOrder === 0n) {
      toast.error('Amount too low. Please enter a valid amount.');
      setRequestId(generateRequestId());
      return;
    }
    
    // ERC20 only
    if (!selectedCrypto.address) { // Changed from .contract to .address for approval
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
          address: selectedCrypto.address as Hex, // Use selectedCrypto.address
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS, unlimitedApprovalAmount],
        });
        return;
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
      // No approval needed, proceed with main transaction
      try {
        setTxStatus('waitingForSignature'); // Set status for main transaction signature
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'createOrder',
            args: [
                bytes32RequestId,
                toHex(BigInt(selectedCrypto.tokenType), { size: 32 }), // Converted number to BigInt then to Hex for bytes32
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
    selectedTokenAddress && // Changed from 'crypto'
    provider &&
    plan &&
    smartCardNumber &&
    customerName &&
    verificationSuccess &&
    priceNGN &&
    amountNGN > 0 &&
    requestId;

  // Updated isButtonDisabled logic (removed simulation-related states)
  const isButtonDisabled = loading || loadingProviders || loadingPlans || verifyingCard || !canPay ||
                           isApprovePending || isApprovalConfirming ||
                           isWritePending || isConfirming || txStatus === 'backendProcessing' ||
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
        <h1 className="text-3xl font-bold mb-4">Pay TV Subscription</h1>
        <p className="text-muted-foreground mb-8">
          Pay for your TV subscription using supported cryptocurrencies on Base chain.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Crypto to TV Subscription</CardTitle>
            <CardDescription>
              Preview and calculate your TV subscription payment with crypto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* crypto selection - now dynamic */}
            <div className="space-y-2">
              <Label htmlFor="crypto-select">Pay With</Label>
              <Select value={selectedTokenAddress} onValueChange={setSelectedTokenAddress}> {/* Changed from 'crypto' to 'selectedTokenAddress' */}
                <SelectTrigger id="crypto-select"><SelectValue placeholder="Select crypto" /></SelectTrigger>
                <SelectContent>
                  {activeTokens.length === 0 ? (
                    <SelectItem value="" disabled>No tokens available</SelectItem>
                  ) : (
                    activeTokens.map(c => (
                      <SelectItem key={c.address} value={c.address}> {/* Changed key and value to address */}
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
                  {selectedCrypto && selectedPlan && priceNGN ? ( // Changed 'crypto' to 'selectedCrypto'
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
                // disabled={isButtonDisabled} // Use the combined disabled state
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
                canPay ? (needsApproval ? "Approve & Pay TV Subscription" : "Pay TV Subscription") :
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
        errorMessage={transactionError || approvalError}
        backendMessage={backendMessage}
        requestId={requestId}
      />
    </AuthGuard>
  )
}
