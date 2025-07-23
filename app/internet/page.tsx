// app/internet/page.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react" // Added useRef
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import BackToDashboard from '@/components/BackToDashboard'
import AuthGuard from "@/components/AuthGuard"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react" // Added for verification UI

import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { ERC20_ABI } from "@/config/erc20Abi"; // Import ERC20 ABI
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'; // Removed useSimulateContract
import { usePrivy } from '@privy-io/react-auth';
import { parseEther, parseUnits, toBytes, toHex, Hex } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";
import { useBaseNetworkEnforcer } from '@/hooks/useBaseNetworkEnforcer'; // Import the network enforcer hook

import { buyinternet } from "@/lib/api";

// Base chain contract addresses (ensure these are correct for Base Mainnet)
const USDT_CONTRACT_ADDRESS = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"; // Replace with actual USDT contract on Base
const USDC_CONTRACT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Replace with actual USDC contract on Base

const CRYPTOS = [
    { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", tokenType: 0, decimals: 18, contract: undefined }, // ETH has no contract address
    { symbol: "USDT", name: "Tether", coingeckoId: "tether", tokenType: 1, decimals: 6, contract: USDT_CONTRACT_ADDRESS },
    { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", tokenType: 2, decimals: 6, contract: USDC_CONTRACT_ADDRESS },
]

interface InternetPlan {
    variation_code: string
    name: string
    variation_amount: string
    fixedPrice: string
}

// Generate unique requestId
function generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}

async function fetchPrices() {
    const ids = CRYPTOS.map((c) => c.coingeckoId).join(",")
    const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`
    )
    return await res.json()
}

async function fetchInternetPlans(serviceID: string) {
    try {
        console.log(`Fetching plans for service: ${serviceID}`)
        const response = await fetch(`/api/vtpass/service-variations?serviceID=${serviceID}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error(`HTTP error! status: ${response.status}`, errorData)
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log('Fetched plans data:', data)
        return data.content?.variations || []
    } catch (error) {
        console.error('Error fetching internet plans:', error)
        return []
    }
}

// Function to get all available data services
async function fetchDataServices() {
    try {
        const response = await fetch('/api/vtpass/services?identifier=data', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log('Available data services:', data)
        return data.content || []
    } catch (error) {
        console.error('Error fetching data services:', error)
        return []
    }
}

export default function InternetPage() {
    const [crypto, setCrypto] = useState("")
    const [provider, setProvider] = useState("")
    const [plan, setPlan] = useState("")
    const [customerID, setCustomerID] = useState("")
    const [plans, setPlans] = useState<InternetPlan[]>([])
    const [prices, setPrices] = useState<any>({})
    const [loading, setLoading] = useState(false)
    const [loadingPlans, setLoadingPlans] = useState(false)
    const [availableProviders, setAvailableProviders] = useState<any[]>([])
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

    const selectedCrypto = CRYPTOS.find((c) => c.symbol === crypto)
    const selectedPlan = plans.find((p) => p.variation_code === plan)
    const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
    const amountNGN = selectedPlan ? Number(selectedPlan.variation_amount) : 0
    const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0

    // For the main contract call, use the exact amount needed.
    let tokenAmountForOrder: bigint = BigInt(0);
    let valueForEth: bigint = BigInt(0);

    if (selectedCrypto && cryptoNeeded > 0) {
        if (selectedCrypto.symbol === 'ETH') {
            valueForEth = parseEther(cryptoNeeded.toFixed(18));
        } else {
            // FIX: Ensure full precision for parseUnits by using selectedCrypto.decimals directly in toFixed.
            tokenAmountForOrder = parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals);
        }
    }
    const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 });

    // For approval, use the maximum uint256 value for unlimited approval.
    const unlimitedApprovalAmount = parseUnits('115792089237316195423570985008687907853269984665640564039457584007913129639935', 0);

    // Wagmi Hooks for TOKEN APPROVAL Transaction (removed simulation)
    const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending, isError: isApproveError, error: approveWriteError } = useWriteContract();

    const { isLoading: isApprovalConfirming, isSuccess: isApprovalTxConfirmed, isError: isApprovalConfirmError, error: approveConfirmError } = useWaitForTransactionReceipt({
        hash: approveHash as Hex,
        query: {
            enabled: Boolean(approveHash),
            refetchInterval: 1000,
        },
    });

    // Wagmi Hooks for MAIN PAYMENT Transaction (removed simulation)
    const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
        hash: hash as Hex,
        query: {
            enabled: Boolean(hash),
            refetchInterval: 1000,
        },
    });

    useEffect(() => {
        setLoading(true)
        Promise.all([fetchPrices(), fetchDataServices()]).then(([priceData, serviceData]) => {
            setPrices(priceData)
            setAvailableProviders(serviceData)
            setLoading(false)
        })
    }, [])

    useEffect(() => {
        if (provider) {
            setLoadingPlans(true)
            setPlan("")
            fetchInternetPlans(provider).then((planData) => {
                console.log(`Plans for ${provider}:`, planData)
                setPlans(planData)
                setLoadingPlans(false)
            }).catch((error) => {
                console.error('Error loading plans:', error)
                setPlans([])
                setLoadingPlans(false)
            })
        } else {
            setPlans([])
            setPlan("")
        }
    }, [provider])

    // Generate requestId when user starts filling form
    useEffect(() => {
        if ((crypto || provider || plan || customerID) && !requestId) {
            setRequestId(generateRequestId())
        } else if (!(crypto || provider || plan || customerID) && requestId) {
            setRequestId(undefined);
        }
    }, [crypto, provider, plan, customerID, requestId])

    // handlePostTransaction with useCallback
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
    const response = await buyinternet({
      requestId: requestId!,
      phone: customerID,
      serviceID: provider,
      variation_code: plan,
      amount: amountNGN,
      cryptoUsed: parseFloat(cryptoNeeded.toFixed(selectedCrypto?.decimals || 6)),
      cryptoSymbol: selectedCrypto?.symbol!,
      transactionHash,
      userAddress: address!
    });

    console.log('Backend success response:', response);
    setTxStatus('backendSuccess');
    setBackendMessage("Internet data delivered successfully!");
    toast.success("Internet data delivered successfully!", { id: 'backend-status' });

    setCrypto("");
    setProvider("");
    setPlan("");
    setCustomerID("");
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
}, [requestId, customerID, provider, plan, amountNGN, cryptoNeeded, selectedCrypto?.symbol, selectedCrypto?.decimals, address]);

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
            toast.success("Token approved for unlimited spending! Proceeding with payment...", { id: 'approval-status' });
            console.log("Approval: Blockchain confirmed! Initiating main transaction...");
            // The main transaction will be initiated automatically after approval
        } else if (isApproveError || isApprovalConfirmError) {
            setTxStatus('approvalError');
            const errorMsg = (approveWriteError?.message || approveConfirmError?.message || "Token approval failed").split('\n')[0];
            setApprovalError(errorMsg);
            setTransactionError(errorMsg);
            toast.error(`Approval failed: ${errorMsg}`, { id: 'approval-status' });
        }
    }, [isApprovePending, approveHash, isApprovalTxConfirmed, isApprovalConfirming, isApproveError, isApprovalConfirmError, approveWriteError, approveConfirmError, showTransactionModal]);

    // Effect to monitor main transaction status
    useEffect(() => {
        if (!showTransactionModal) return; // Only run if modal is open
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
            // Add a guard to ensure handlePostTransaction is called only once per confirmed hash
            if (txStatus !== 'backendProcessing' && txStatus !== 'backendSuccess' && txStatus !== 'backendError') {
                setTxStatus('success'); // Mark blockchain part as success
                setTransactionHashForModal(hash);
                toast.success("Blockchain transaction confirmed! Processing order...", { id: 'tx-status' });
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
        } else {
            // Only reset to idle if not in any active transaction or approval state
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
        // Show modal immediately on purchase attempt
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
        if (!selectedPlan) {
            toast.error("Please select a data plan.");
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

        // Token Approval Logic (Per-Transaction) - No Simulation
        if (selectedCrypto.tokenType !== 0) { // If it's an ERC20 token (USDT or USDC)
            if (!selectedCrypto.contract) {
                setApprovalError("Selected crypto has no contract address for approval.");
                setTransactionError("Selected crypto has no contract address for approval.");
                setTxStatus('approvalError');
                toast.error("Selected crypto has no contract address for approval.");
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
    };

    // Auto-initiate main transaction after approval is confirmed
    useEffect(() => {
        if (isApprovalTxConfirmed && selectedCrypto && selectedCrypto.tokenType !== 0 && showTransactionModal) {
            // Slight delay to allow UI to update
            const timer = setTimeout(() => {
                try {
                    setTxStatus('waitingForSignature');
                    toast.info("Starting payment transaction...");
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
                    console.error("Error sending main transaction after approval:", error);
                    const errorMsg = error.message || "Failed to send payment transaction.";
                    setTransactionError(errorMsg);
                    setTxStatus('error');
                    toast.error(errorMsg);
                }
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [isApprovalTxConfirmed, selectedCrypto, showTransactionModal, writeContract, bytes32RequestId, tokenAmountForOrder, valueForEth]);

    // Wrapped handleCloseModal in useCallback
    const handleCloseModal = useCallback(() => {
        setShowTransactionModal(false);
        setTxStatus('idle'); // Reset status to idle when modal closes
        setTransactionError(null); // Clear any errors
        setBackendMessage(null); // Clear backend messages
        setTransactionHashForModal(undefined); // Clear hash
        setApprovalError(null); // Clear approval specific errors
        backendRequestSentRef.current = null; // Clear ref on modal close to allow new transactions
    }, []); // Empty dependency array as it doesn't depend on any changing state

    const providersToShow = availableProviders.length > 0 ? availableProviders : [];

    const isFormValid = Boolean(crypto && provider && plan && customerID && requestId && cryptoNeeded > 0);
    // Updated isButtonDisabled logic - removed simulation checks
    const isButtonDisabled = loading || loadingPlans || isWritePending || isConfirming || txStatus === 'backendProcessing' || !isFormValid ||
                             isApprovePending || isApprovalConfirming || // Removed simulation states
                             !isOnBaseChain || isSwitchingChain; // Disable if not on Base or switching

    return (
        <AuthGuard>
            <div className="container py-10 max-w-xl mx-auto">
                <BackToDashboard />
                <h1 className="text-3xl font-bold mb-4">Buy Internet Data</h1>
                <p className="text-muted-foreground mb-8">
                    Purchase internet data bundles using USDT, USDC, or ETH on Base chain.
                </p>
                <Card>
                    <CardHeader>
                        <CardTitle>Crypto to Internet Data</CardTitle>
                        <CardDescription>
                            Preview and calculate your internet data purchase with crypto
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="crypto">Pay With</Label>
                                <Select value={crypto} onValueChange={setCrypto}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select crypto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CRYPTOS.map((c) => (
                                            <SelectItem key={c.symbol} value={c.symbol}>
                                                {c.symbol} - {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="provider">Internet Provider</Label>
                                <Select value={provider} onValueChange={setProvider}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providersToShow.map((p) => (
                                            <SelectItem key={p.serviceID || p.id} value={p.serviceID}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="plan">Data Plan</Label>
                                <Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingPlans ? "Loading plans..." : "Select data plan"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {plans.length > 0 ? (
                                            plans.map((p) => (
                                                <SelectItem key={p.variation_code} value={p.variation_code}>
                                                    {p.name} - ₦{Number(p.variation_amount).toLocaleString()}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            !loadingPlans && provider && (
                                                <SelectItem value="no-plans" disabled>
                                                    No plans available for this provider
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customerID">Customer ID / Phone Number</Label>
                                <Input
                                    id="customerID"
                                    type="text"
                                    placeholder="Enter customer ID or phone number"
                                    value={customerID}
                                    maxLength={11}
                                    onChange={(e) => setCustomerID(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="border-t pt-4 space-y-2">
                            {requestId && (
                                <div className="flex justify-between text-sm">
                                    <span>Request ID:</span>
                                    <span className="text-muted-foreground font-mono text-xs">{requestId}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span>Conversion Rate:</span>
                                <span>
                                    {selectedCrypto && priceNGN
                                        ? `₦${priceNGN.toLocaleString()} / 1 ${selectedCrypto.symbol}`
                                        : "--"}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Plan Amount:</span>
                                <span>
                                    {selectedPlan ? `₦${Number(selectedPlan.variation_amount).toLocaleString()}` : "--"}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>You will pay:</span>
                                <span>
                                    {cryptoNeeded > 0 && selectedCrypto ? (
                                        <Badge variant="outline">
                                            {cryptoNeeded.toFixed(selectedCrypto.decimals)}{" "} {crypto} {/* Adjusted toFixed for display */}
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
                            isFormValid ? "Purchase Internet Data" :
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
                errorMessage={transactionError || approvalError || backendMessage}
                backendMessage={backendMessage}
                requestId={requestId}
            />
        </AuthGuard>
    )
}
