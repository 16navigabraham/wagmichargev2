// app/internet/page.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import BackToDashboard from '@/components/BackToDashboard'
import AuthGuard from "@/components/AuthGuard"
import { Loader2, AlertCircle } from "lucide-react"

import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { ERC20_ABI } from "@/config/erc20Abi";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { parseUnits, toBytes, toHex, Hex, fromHex, formatUnits } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";
import { useBaseNetworkEnforcer } from '@/hooks/useBaseNetworkEnforcer';

import { buyinternet, getServiceVariations, getServices } from "@/lib/api";
import { TokenConfig } from "@/lib/tokenlist";
import { fetchActiveTokensWithMetadata } from "@/lib/tokenUtils";

async function fetchPrices(tokenList: TokenConfig[]): Promise<Record<string, any>> {
  const ids = tokenList.map((c: TokenConfig) => c.coingeckoId).join(",");
  if (!ids) return {};
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`);
  return res.ok ? await res.json() : {};
}

interface InternetPlan {
    variation_code: string
    name: string
    variation_amount: string
    fixedPrice: string
}

function generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

async function fetchInternetPlans(serviceID: string) {
    console.log(`[fetchInternetPlans] Attempting to fetch plans for serviceID: ${serviceID}`);
    try {
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
        console.log('[fetchInternetPlans] Fetched plans data:', data)
        return data.content?.variations || []
    } catch (error) {
        console.error('[fetchInternetPlans] Error fetching internet plans:', error)
        return []
    }
}

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
        console.log('Available data services response:', data);
        console.log('Content array:', data.content);
        
        // Return the actual services array
        const services = data.content || [];
        console.log('Processed services:', services);
        
        return services;
    } catch (error) {
        console.error('Error fetching data services:', error)
        return []
    }
}

export default function InternetPage() {
    const [activeTokens, setActiveTokens] = useState<TokenConfig[]>([]);
    const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>("");
    const [provider, setProvider] = useState("");
    const [plan, setPlan] = useState("");
    const [customerID, setCustomerID] = useState("");
    const [plans, setPlans] = useState<InternetPlan[]>([]);
    const [prices, setPrices] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [availableProviders, setAvailableProviders] = useState<any[]>([]);
    const [requestId, setRequestId] = useState<string | undefined>(undefined);

    const [txStatus, setTxStatus] = useState<'idle' | 'waitingForApprovalSignature' | 'approving' | 'approvalSuccess' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'backendProcessing' | 'backendSuccess' | 'backendError' | 'error'>('idle');
    const [transactionError, setTransactionError] = useState<string | null>(null);
    const [backendMessage, setBackendMessage] = useState<string | null>(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);

    const backendRequestSentRef = useRef<Hex | null>(null);

    const { connectWallet, authenticated } = usePrivy();
    const { address } = useAccount();
    const { isOnBaseChain, isSwitchingChain, promptSwitchToBase } = useBaseNetworkEnforcer();

    // Load tokens and prices on initial mount
    useEffect(() => {
        async function loadTokensAndPricesAndProviders() {
            setLoading(true);
            try {
                console.log("Starting to load tokens, prices, and providers...");
                
                const tokens = await fetchActiveTokensWithMetadata();
                console.log("Fetched tokens:", tokens);
                
                // Filter out ETH (tokenType 0) - only ERC20 tokens supported
                const erc20Tokens = tokens.filter(token => token.tokenType !== 0);
                setActiveTokens(erc20Tokens);
                console.log("Filtered ERC20 tokens:", erc20Tokens);
                
                const prices = await fetchPrices(tokens);
                console.log("Fetched prices:", prices);
                setPrices(prices);
                
                const serviceData = await fetchDataServices();
                console.log("Fetched service data:", serviceData);
                setAvailableProviders(serviceData);

            } catch (error) {
                console.error("Error loading tokens, prices, or providers:", error);
                toast.error("Failed to load essential data. Please try again.");
            } finally {
                setLoading(false);
            }
        }
        loadTokensAndPricesAndProviders();
    }, []);

    // Effect to fetch plans when provider changes
    useEffect(() => {
        console.log(`[useEffect - provider] Provider changed to: ${provider}`);
        if (!provider) {
            setPlans([]);
            setPlan("");
            return;
        }
        setLoadingPlans(true)
        fetchInternetPlans(provider)
            .then(data => {
                console.log(`[useEffect - provider] Plans received:`, data);
                setPlans(data);
                // Optionally set a default plan if plans are loaded and none is selected
                if (data.length > 0 && !plan) {
                    setPlan(data[0].variation_code);
                }
            })
            .catch(error => {
                console.error(`[useEffect - provider] Error fetching plans for ${provider}:`, error);
                setPlans([]);
                toast.error(`Failed to load plans for ${provider}.`);
            })
            .finally(() => setLoadingPlans(false));
    }, [provider, plan]);

    // Generate requestId when form has data
    useEffect(() => {
        if ((selectedTokenAddress || provider || plan || customerID) && !requestId) {
            setRequestId(generateRequestId());
        } else if (!(selectedTokenAddress || provider || plan || customerID) && requestId) {
            setRequestId(undefined);
        }
    }, [selectedTokenAddress, provider, plan, customerID, requestId]);

    // Derived values
    const selectedCrypto = activeTokens.find((c) => c.address === selectedTokenAddress);
    const selectedPlan = plans.find((p) => p.variation_code === plan);
    const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null;
    const amountNGN = selectedPlan ? Number(selectedPlan.variation_amount) : 0;
    const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0;

    let tokenAmountForOrder: bigint = BigInt(0);

    if (selectedCrypto && cryptoNeeded > 0) {
        tokenAmountForOrder = parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals);
    }
    const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 });

    // Check if requestId is already used
    const { data: existingOrder } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getOrder',
        args: [fromHex(bytes32RequestId, 'bigint')],
        query: {
            enabled: Boolean(requestId && address),
        },
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

            // Reset form for next transaction after a delay
            setTimeout(() => {
                setSelectedTokenAddress("");
                setProvider("");
                setPlan("");
                setCustomerID("");
                setRequestId(undefined);
                backendRequestSentRef.current = null;
            }, 3000); // 3 second delay to allow user to see success

        } catch (error: unknown) {
            console.error("Backend API call failed:", error);
            setTxStatus('backendError');

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            let userFriendlyMessage = errorMessage;
            if (errorMessage.includes('HTML instead of JSON')) {
                userFriendlyMessage = 'Server error occurred. Please try again or contact support.';
            } else if (errorMessage.includes('Invalid JSON')) {
                userFriendlyMessage = 'Communication error with server. Please try again.';
            } else if (errorMessage.includes('Failed to fetch')) {
                userFriendlyMessage = 'Network error. Please check your connection and try again.';
            }

            const fullMessage = `${userFriendlyMessage}. Request ID: ${requestId}`;
            setBackendMessage(fullMessage);
            toast.error(fullMessage, { id: 'backend-status' });
        }
    }, [requestId, customerID, provider, plan, amountNGN, cryptoNeeded, selectedCrypto?.symbol, selectedCrypto?.decimals, address]);

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
            
            console.log("Approval: Blockchain confirmed! Initiating main transaction...");
            
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
                            selectedCrypto?.address as Hex,
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
            }, 2000);
            
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
        if (!selectedCrypto) {
            toast.error("Please select a cryptocurrency.");
            setTxStatus('error');
            return;
        }

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
        console.log("Existing order check:", existingOrder);
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

    const providersToShow = availableProviders.length > 0 ? availableProviders : [];

    
    const isRequestIdUsed = existingOrder && existingOrder.user && existingOrder.user !== '0x0000000000000000000000000000000000000000';
    
    const isButtonDisabled = loading || 
                             loadingPlans || 
                             ['waitingForApprovalSignature', 'approving', 'waitingForSignature', 'sending', 'confirming', 'backendProcessing'].includes(txStatus) ||
                             !isFormValid ||
                             isApprovePending || 
                             isApprovalConfirming || 
                             isWritePending ||
                             isConfirming ||
                             !isOnBaseChain || 
                             isSwitchingChain ||
                             isRequestIdUsed;

    if (loading) {
        return (
            <AuthGuard>
                <div className="container py-10 max-w-xl mx-auto">
                    <div className="flex items-center justify-center p-10">
                        <Loader2 className="w-8 h-8 animate-spin mr-2" />
                        <span>Loading active tokens...</span>
                    </div>
                </div>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            <div className="container py-10 max-w-xl mx-auto">
                <BackToDashboard />
                <h1 className="text-3xl font-bold mb-4">Buy Internet Data</h1>
                <p className="text-muted-foreground mb-8">
                    Purchase internet data bundles using supported ERC20 cryptocurrencies on Base chain.
                </p>
                <Card>
                    <CardHeader>
                        <CardTitle>Crypto to Internet Data</CardTitle>
                        <CardDescription>
                            Preview and calculate your internet data purchase with crypto
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Pay With Token Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="crypto">Pay With</Label>
                            <Select value={selectedTokenAddress} onValueChange={setSelectedTokenAddress}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select ERC20 token" />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeTokens.length === 0 ? (
                                        <SelectItem value="" disabled>No ERC20 tokens available</SelectItem>
                                    ) : (
                                        activeTokens.map((c) => (
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
                        
                        {/* Internet Provider Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="provider">Internet Provider</Label>
                            <Select value={provider} onValueChange={setProvider}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    {providersToShow.length === 0 ? (
                                        <SelectItem value="" disabled>No providers available</SelectItem>
                                    ) : (
                                        providersToShow.map((p) => (
                                            <SelectItem key={p.serviceID} value={p.serviceID}>
                                                {p.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {availableProviders.length === 0 && !loading && (
                                <p className="text-sm text-yellow-600">
                                    No internet providers found from backend.
                                </p>
                            )}
                        </div>
                        
                        {/* Data Plan Selection */}
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
                        
                        {/* Customer ID / Phone Number */}
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
                        
                        {/* Request ID status indicator */}
                        {isRequestIdUsed && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="text-sm text-red-700">
                                    Request ID already used. A new one will be generated.
                                </span>
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
                                            {cryptoNeeded.toFixed(selectedCrypto.decimals)}{" "} {selectedCrypto.symbol}
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
                            isRequestIdUsed ? "Generating New Request ID..." :
                            txStatus === 'waitingForApprovalSignature' ? "Awaiting Approval Signature..." :
                            txStatus === 'approving' ? "Approving Token..." :
                            txStatus === 'approvalSuccess' ? "Approval Complete - Starting Payment..." :
                            txStatus === 'waitingForSignature' ? "Awaiting Payment Signature..." :
                            txStatus === 'sending' ? "Sending Payment..." :
                            txStatus === 'confirming' ? "Confirming Payment..." :
                            txStatus === 'success' ? "Payment Confirmed!" :
                            txStatus === 'backendProcessing' ? "Processing Order..." :
                            txStatus === 'backendSuccess' ? "Data Delivered Successfully!" :
                            txStatus === 'backendError' ? "Order Failed - Try Again" :
                            txStatus === 'error' ? "Transaction Failed - Try Again" :
                            isFormValid ? "Approve & Purchase Internet Data" :
                            "Fill all details"}
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