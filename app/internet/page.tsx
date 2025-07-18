// app/internet/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import BackToDashboard from '@/components/BackToDashboard'
import AuthGuard from "@/components/AuthGuard"

import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { ERC20_ABI } from "@/config/erc20Abi"; // Import ERC20 ABI
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'; // Removed useReadContract
import { usePrivy } from '@privy-io/react-auth';
import { parseEther, parseUnits, toBytes, toHex, Hex } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";
import { useBaseNetworkEnforcer } from '@/hooks/useBaseNetworkEnforcer'; // Import the network enforcer hook

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

    // --- START OF MODIFICATIONS: Transaction and Approval States ---
    const [txStatus, setTxStatus] = useState<'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' | 'backendProcessing' | 'backendSuccess' | 'backendError' | 'waitingForApprovalSignature' | 'approving' | 'approvalSuccess' | 'approvalError'>('idle');
    const [transactionError, setTransactionError] = useState<string | null>(null);
    const [backendMessage, setBackendMessage] = useState<string | null>(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);

    // Removed currentAllowance and isApprovalConfirmed states as per "no storing of approval"
    const [approvalError, setApprovalError] = useState<string | null>(null);
    // --- END OF MODIFICATIONS ---

    const { connectWallet, authenticated, user } = usePrivy();
    const { isConnected, address } = useAccount();

    // --- START OF MODIFICATIONS: Network Enforcer Hook ---
    const { isOnBaseChain, isSwitchingChain, promptSwitchToBase } = useBaseNetworkEnforcer();
    // --- END OF MODIFICATIONS ---

    const selectedCrypto = CRYPTOS.find((c) => c.symbol === crypto)
    const selectedPlan = plans.find((p) => p.variation_code === plan)
    const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
    const amountNGN = selectedPlan ? Number(selectedPlan.variation_amount) : 0
    const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0

    // --- START OF MODIFICATIONS: Wagmi Hooks for Main Transaction and Approval ---
    const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
        hash: hash as Hex,
        query: {
            enabled: Boolean(hash),
            refetchInterval: 1000, // FIX: Faster polling for main transaction
        },
    });

    // Removed useReadContract for allowance as per "no storing of approval"
    // const { data: allowanceData, refetch: refetchAllowance, isLoading: isAllowanceLoading } = useReadContract(...)

    const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending, isError: isApproveError, error: approveWriteError } = useWriteContract();

    const { isLoading: isApprovalConfirming, isSuccess: isApprovalTxConfirmed, isError: isApprovalConfirmError, error: approveConfirmError } = useWaitForTransactionReceipt({
        hash: approveHash as Hex,
        query: {
            enabled: Boolean(approveHash),
            refetchInterval: 1000, // FIX: Faster polling for approval transaction
        },
    });
    // --- END OF MODIFICATIONS ---

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

    // Removed useEffect for currentAllowance as per "no storing of approval"
    // useEffect(() => { ... }, [allowanceData]);

    // Generate requestId when user starts filling form
    useEffect(() => {
        if ((crypto || provider || plan || customerID) && !requestId) {
            setRequestId(generateRequestId())
        } else if (!(crypto || provider || plan || customerID) && requestId) {
            setRequestId(undefined);
        }
    }, [crypto, provider, plan, customerID, requestId])

    // --- START OF MODIFICATIONS: handlePostTransaction with useCallback ---
    const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
        setTxStatus('backendProcessing');
        setBackendMessage("Processing your order...");
        toast.loading("Processing order with VTpass...", { id: 'backend-status' });

        try {
            const orderData = {
                requestId,
                crypto: selectedCrypto?.symbol, // Safely access symbol
                provider,
                plan,
                customerID,
                amount: amountNGN,
                cryptoNeeded,
                type: 'internet',
                transactionHash,
                userAddress: address,
            };
            console.log('Submitting order to backend:', orderData);
            const backendResponse = await fetch('/api/internet', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId,
                    phone: customerID, // Assuming customerID is the phone number for internet
                    serviceID: provider,
                    variation_code: plan,
                    amount: amountNGN,
                    cryptoUsed: cryptoNeeded,
                    cryptoSymbol: selectedCrypto?.symbol, // Safely access symbol
                    transactionHash
                }),
            });

            const responseData = await backendResponse.json();

            if (!backendResponse.ok) {
                throw new Error(responseData.message || responseData.error || "Failed to deliver internet data via backend.");
            }

            setTxStatus('backendSuccess');
            setBackendMessage(responseData.message || "Internet data delivered successfully!");
            toast.success("Internet data delivered successfully!", { id: 'backend-status' });
            setCrypto("");
            setProvider("");
            setPlan("");
            setCustomerID("");
            setRequestId(undefined);
            // Removed setIsApprovalConfirmed(false); and setCurrentAllowance(undefined);
        } catch (backendError: any) {
            console.error("Backend API call failed:", backendError);
            setTxStatus('backendError');
            const msg = `Backend processing failed: ${backendError.message}. Please contact support with Request ID: ${requestId}`;
            setBackendMessage(msg);
            toast.error(msg, { id: 'backend-status' });
        }
    }, [requestId, selectedCrypto?.symbol, provider, plan, customerID, amountNGN, cryptoNeeded, address]);
    // --- END OF MODIFICATIONS ---

    // --- START OF MODIFICATIONS: Handle transaction status feedback and modal display ---
    // Effect to monitor approval transaction status
    useEffect(() => {
        if (isApprovePending) {
            setTxStatus('waitingForApprovalSignature');
            setShowTransactionModal(true);
            setTransactionHashForModal(undefined);
            setTransactionError(null);
            setBackendMessage(null);
            setApprovalError(null);
            toast.info("Awaiting token approval signature...");
        } else if (approveHash) {
            setTxStatus('approving');
            setShowTransactionModal(true);
            setTransactionHashForModal(approveHash);
            toast.loading("Token approval sent, waiting for confirmation...", { id: 'approval-status' });
        } else if (isApprovalTxConfirmed) {
            setTxStatus('approvalSuccess');
            setShowTransactionModal(true);
            setApprovalError(null);
            toast.success("Token approved! Proceeding with payment...", { id: 'approval-status' });
            console.log("Approval: Blockchain confirmed! Initiating main transaction...");

            // FIX: Add a small delay to allow UI to update to 'approvalSuccess' before triggering next step
            const initiateMainTransaction = setTimeout(() => {
                if (selectedCrypto) { // Ensure selectedCrypto is defined
                    const tokenAmount = parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals);
                    const value = selectedCrypto.symbol === 'ETH' && cryptoNeeded > 0
                        ? parseEther(cryptoNeeded.toFixed(18))
                        : BigInt(0);
                    const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 }); // Ensure requestId is not undefined

                    try {
                        setTxStatus('waitingForSignature'); // Update status for main transaction
                        writeContract({
                            address: CONTRACT_ADDRESS,
                            abi: CONTRACT_ABI,
                            functionName: 'createOrder', // Or your internet specific function
                            args: [
                                bytes32RequestId,
                                selectedCrypto.tokenType,
                                tokenAmount,
                            ],
                            value: value,
                        });
                        console.log("Main transaction initiated after approval.");
                    } catch (error: any) {
                        console.error("Error initiating main transaction after approval:", error);
                        const errorMsg = error.message || "Failed to send main transaction after approval.";
                        setTransactionError(errorMsg);
                        setTxStatus('error');
                        toast.error(errorMsg);
                    }
                } else {
                    console.error("Selected crypto is undefined after approval, cannot initiate main transaction.");
                    setTransactionError("Selected cryptocurrency is missing. Cannot proceed with payment.");
                    setTxStatus('error');
                    toast.error("An internal error occurred. Please try again.");
                }
            }, 500); // 500ms delay

            return () => clearTimeout(initiateMainTransaction); // Cleanup timeout on unmount or re-render

        } else if (isApproveError || isApprovalConfirmError) {
            setTxStatus('approvalError');
            const errorMsg = (approveWriteError?.message || approveConfirmError?.message || "Token approval failed").split('\n')[0];
            setApprovalError(errorMsg);
            setTransactionError(errorMsg);
            setShowTransactionModal(true);
            toast.error(`Approval failed: ${errorMsg}`, { id: 'approval-status' });
        }
    }, [isApprovePending, approveHash, isApprovalTxConfirmed, isApprovalConfirming, isApproveError, isApprovalConfirmError, approveWriteError, approveConfirmError, writeContract, selectedCrypto, cryptoNeeded, requestId]);

    // Effect to monitor main transaction status
    useEffect(() => {
        if (['waitingForApprovalSignature', 'approving', 'approvalSuccess', 'approvalError'].includes(txStatus)) {
            return;
        }

        if (isWriteError) {
            setTxStatus('error');
            const errorMsg = writeError?.message?.split('\n')[0] || "Wallet transaction failed or was rejected.";
            setTransactionError(errorMsg);
            setShowTransactionModal(true);
            toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
            return;
        }

        if (isWritePending) {
            setTxStatus('waitingForSignature');
            setShowTransactionModal(true);
            setTransactionHashForModal(undefined);
            setTransactionError(null);
            setBackendMessage(null);
            toast.info("Awaiting wallet signature...");
        } else if (hash) {
            if (isConfirming) {
                setTxStatus('confirming');
                setShowTransactionModal(true);
                toast.loading("Transaction sent, confirming on blockchain...", { id: 'tx-status' });
            } else if (isConfirmed) {
                setTxStatus('success');
                setShowTransactionModal(true);
                toast.success("Blockchain transaction confirmed! Processing order...", { id: 'tx-status' });
                if (hash) {
                    handlePostTransaction(hash);
                }
            } else if (isConfirmError) {
                setTxStatus('error');
                const errorMsg = confirmError?.message?.split('\n')[0] || "Blockchain transaction failed to confirm.";
                setTransactionError(errorMsg);
                setShowTransactionModal(true);
                toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
            } else {
                setTxStatus('sending');
                setShowTransactionModal(true);
                setTransactionHashForModal(hash);
                toast.loading("Transaction sent, waiting for blockchain confirmation...", { id: 'tx-status' });
            }
        } else {
            if (!['waitingForApprovalSignature', 'approving', 'approvalSuccess', 'approvalError'].includes(txStatus)) {
                setTxStatus('idle');
                setTransactionError(null);
                setBackendMessage(null);
                setTransactionHashForModal(undefined);
            }
        }
    }, [isWritePending, hash, isConfirming, isConfirmed, isWriteError, isConfirmError, writeError, confirmError, txStatus, handlePostTransaction]);
    // --- END OF MODIFICATIONS ---

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
        // FIX: Show modal immediately on purchase attempt
        setShowTransactionModal(true);
        setTransactionError(null);
        setBackendMessage(null);
        setApprovalError(null);
        // Removed setIsApprovalConfirmed(false); as it's no longer a persistent state

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


        // Prepare transaction arguments
        const tokenAmount = parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals);

        const value = selectedCrypto.symbol === 'ETH' && cryptoNeeded > 0
            ? parseEther(cryptoNeeded.toFixed(18))
            : BigInt(0);

        const bytes32RequestId: Hex = toHex(toBytes(requestId), { size: 32 });

        // --- START OF MODIFICATIONS: Token Approval Logic (Per-Transaction) ---
        if (selectedCrypto.tokenType !== 0) { // If it's an ERC20 token (USDT or USDC)
            toast.info("Approving token spend for this transaction...");
            setTxStatus('waitingForApprovalSignature'); // Set initial status for approval
            try {
                if (selectedCrypto.contract) { // Ensure contract address exists for ERC20
                    writeApprove({
                        abi: ERC20_ABI,
                        address: selectedCrypto.contract as Hex,
                        functionName: 'approve',
                        args: [CONTRACT_ADDRESS, tokenAmount], // Spender: your escrow contract, Amount: exact tokenAmount
                    });
                } else {
                    toast.error("Selected crypto has no contract address for approval.");
                    setTxStatus('error');
                    return;
                }
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
                        selectedCrypto.tokenType, // selectedCrypto is now guaranteed to be defined
                        tokenAmount,
                    ],
                    value: value,
                });
            } catch (error: any) {
                console.error("Error sending main transaction:", error);
                const errorMsg = error.message || "Failed to send transaction.";
                setTransactionError(errorMsg);
                setTxStatus('error');
                toast.error(errorMsg);
            }
        }
        // --- END OF MODIFICATIONS ---
    };

    // FIX: Wrapped handleCloseModal in useCallback
    const handleCloseModal = useCallback(() => {
        setShowTransactionModal(false);
        setTxStatus('idle'); // Reset status to idle when modal closes
        setTransactionError(null); // Clear any errors
        setBackendMessage(null); // Clear backend messages
        setTransactionHashForModal(undefined); // Clear hash
        setApprovalError(null); // Clear approval specific errors
    }, []); // Empty dependency array as it doesn't depend on any changing state

    const providersToShow = availableProviders.length > 0 ? availableProviders : [];

    const isFormValid = Boolean(crypto && provider && plan && customerID && requestId && cryptoNeeded > 0);
    // --- START OF MODIFICATIONS: Updated isButtonDisabled logic ---
    const isButtonDisabled = loading || loadingPlans || isWritePending || isConfirming || txStatus === 'backendProcessing' || !isFormValid ||
                             isApprovePending || isApprovalConfirming || // Disable during approval steps
                             !isOnBaseChain || isSwitchingChain; // Disable if not on Base or switching
    // Removed isAllowanceLoading and (selectedCrypto?.tokenType !== 0 && !isApprovalConfirmed) as they are no longer relevant
    // --- END OF MODIFICATIONS ---

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
                                    {crypto && selectedPlan && priceNGN ? (
                                        <Badge variant="outline">
                                            {cryptoNeeded.toFixed(6)} {crypto}
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
                errorMessage={transactionError || approvalError} // Pass approvalError to modal
                backendMessage={backendMessage}
                requestId={requestId}
            />
        </AuthGuard>
    )
}
// --- END OF MODIFICATIONS ---