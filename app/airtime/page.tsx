// app/airtime/page.tsx
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
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSimulateContract } from 'wagmi'; // Added useSimulateContract
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

const PROVIDERS = [
    { id: "mtn", name: "MTN" },
    { id: "airtel", name: "Airtel" },
    { id: "glo", name: "Glo" },
    { id: "9mobile", name: "9mobile" },
]

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

export default function AirtimePage() {
    const [crypto, setCrypto] = useState("")
    const [provider, setProvider] = useState("")
    const [amount, setAmount] = useState("")
    const [phone, setPhone] = useState("")
    const [prices, setPrices] = useState<any>({})
    const [loading, setLoading] = useState(false)
    const [requestId, setRequestId] = useState<string | undefined>(undefined);

    const [txStatus, setTxStatus] = useState<'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' | 'backendProcessing' | 'backendSuccess' | 'backendError' | 'waitingForApprovalSignature' | 'approving' | 'approvalSuccess' | 'approvalError'>('idle');
    const [transactionError, setTransactionError] = useState<string | null>(null);
    const [backendMessage, setBackendMessage] = useState<string | null>(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);

    const [approvalError, setApprovalError] = useState<string | null>(null);

    const { connectWallet, authenticated, user } = usePrivy();
    const { isConnected, address } = useAccount();

    const { isOnBaseChain, isSwitchingChain, promptSwitchToBase } = useBaseNetworkEnforcer();

    const selectedCrypto = CRYPTOS.find((c) => c.symbol === crypto)
    const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
    const amountNGN = Number(amount) || 0
    const cryptoNeeded = priceNGN ? amountNGN / priceNGN : 0

    // For the main contract call, use the exact amount needed.
    const tokenAmountForOrder = selectedCrypto ? parseUnits(cryptoNeeded.toFixed(18), selectedCrypto.decimals) : BigInt(0);
    const valueForEth = selectedCrypto?.symbol === 'ETH' && cryptoNeeded > 0
        ? parseEther(cryptoNeeded.toFixed(18))
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
            enabled: Boolean(selectedCrypto?.tokenType !== 0 && selectedCrypto?.contract && address && isConnected && isOnBaseChain),
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

    useEffect(() => {
        setLoading(true)
        fetchPrices().then((data) => {
            setPrices(data)
            setLoading(false)
        })
    }, [])

    // Generate requestId when user starts filling form
    useEffect(() => {
        if ((crypto || provider || amount || phone) && !requestId) {
            setRequestId(generateRequestId())
        } else if (!(crypto || provider || amount || phone) && requestId) {
            setRequestId(undefined); // Clear if form is empty
        }
    }, [crypto, provider, amount, phone, requestId])

    const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
        setTxStatus('backendProcessing');
        setBackendMessage("Processing your order...");
        toast.loading("Processing order with VTpass...", { id: 'backend-status' });

        try {
            const orderData = {
                requestId,
                crypto: selectedCrypto?.symbol,
                provider,
                amount: amountNGN,
                phone,
                cryptoNeeded,
                type: 'airtime',
                transactionHash,
                userAddress: address,
            };
            console.log('Submitting order to backend:', orderData);
            const backendResponse = await fetch('/api/airtime', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId,
                    phone,
                    serviceID: provider,
                    amount: amountNGN,
                    cryptoUsed: cryptoNeeded,
                    cryptoSymbol: selectedCrypto?.symbol,
                    transactionHash,
                    userAddress: address // Added userAddress
                }),
            });

            if (!backendResponse.ok) {
                const errorData = await backendResponse.json();
                throw new Error(errorData.message || "Failed to deliver airtime via backend.");
            }

            setTxStatus('backendSuccess');
            setBackendMessage("Airtime delivered successfully!");
            toast.success("Airtime delivered successfully!", { id: 'backend-status' });
            // Reset form for next transaction
            setCrypto("");
            setProvider("");
            setAmount("");
            setPhone("");
            setRequestId(undefined);
        } catch (backendError: any) {
            setTxStatus('backendError');
            const msg = `Backend processing failed: ${backendError.message}. Please contact support with Request ID: ${requestId}`;
            setBackendMessage(msg);
            console.error("Backend API call failed:", backendError);
            toast.error(msg, { id: 'backend-status' });
        }
    }, [requestId, selectedCrypto?.symbol, amountNGN, phone, cryptoNeeded, address, provider]);

    // Effect to monitor approval transaction status
    useEffect(() => {
        if (isApprovePending) {
            setTxStatus('waitingForApprovalSignature');
            setTransactionHashForModal(undefined);
            setTransactionError(null);
            setBackendMessage(null);
            setApprovalError(null);
            toast.info("Awaiting token approval signature...");
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

            const initiateMainTransaction = setTimeout(() => {
                // If ETH, no approval needed, proceed directly with main transaction
                if (selectedCrypto?.tokenType === 0) {
                    // This path should ideally not be hit if approval logic is correct
                    // but as a fallback, ensure the main tx is initiated.
                    if (simulateWriteData?.request) {
                        setTxStatus('waitingForSignature');
                        writeContract(simulateWriteData.request);
                        console.log("Main transaction initiated after approval (ETH path).");
                    } else if (simulateWriteError) {
                        console.error("Simulation error for ETH main transaction after approval:", simulateWriteError);
                        const errorMsg = simulateWriteError.message || "Simulation failed for ETH transaction.";
                        setTransactionError(errorMsg);
                        setTxStatus('error');
                        toast.error(errorMsg);
                    } else {
                        console.error("No simulation data for ETH main transaction after approval.");
                        setTransactionError("Could not simulate ETH transaction. Please try again.");
                        setTxStatus('error');
                        toast.error("An internal error occurred. Please try again.");
                    }
                } else { // ERC20 token, proceed with main transaction after approval
                    if (simulateWriteData?.request) {
                        setTxStatus('waitingForSignature');
                        writeContract(simulateWriteData.request);
                        console.log("Main transaction initiated after approval (ERC20 path).");
                    } else if (simulateWriteError) {
                        console.error("Simulation error for ERC20 main transaction after approval:", simulateWriteError);
                        const errorMsg = simulateWriteError.message || "Simulation failed for ERC20 transaction after approval.";
                        setTransactionError(errorMsg);
                        setTxStatus('error');
                        toast.error(errorMsg);
                    } else {
                        console.error("No simulation data for ERC20 main transaction after approval.");
                        setTransactionError("Could not simulate ERC20 transaction. Please try again.");
                        setTxStatus('error');
                        toast.error("An internal error occurred. Please try again.");
                    }
                }
            }, 500);

            return () => clearTimeout(initiateMainTransaction);

        } else if (isApproveError || isApprovalConfirmError) {
            setTxStatus('approvalError');
            const errorMsg = (approveWriteError?.message || approveConfirmError?.message || simulateApproveError?.message || "Token approval failed").split('\n')[0];
            setApprovalError(errorMsg);
            setTransactionError(errorMsg);
            toast.error(`Approval failed: ${errorMsg}`, { id: 'approval-status' });
        }
    }, [isApprovePending, approveHash, isApprovalTxConfirmed, isApprovalConfirming, isApproveError, isApprovalConfirmError, approveWriteError, approveConfirmError, writeContract, simulateWriteData, simulateWriteError, selectedCrypto, cryptoNeeded, requestId]);


    // Effect to monitor main transaction status
    useEffect(() => {
        if (['waitingForApprovalSignature', 'approving', 'approvalSuccess', 'approvalError'].includes(txStatus)) {
            return;
        }

        if (isWriteError) {
            setTxStatus('error');
            const errorMsg = writeError?.message?.split('\n')[0] || simulateWriteError?.message?.split('\n')[0] || "Wallet transaction failed or was rejected.";
            setTransactionError(errorMsg);
            toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
            return;
        }

        if (isWritePending) {
            setTxStatus('waitingForSignature');
            setTransactionHashForModal(undefined);
            setTransactionError(null);
            setBackendMessage(null);
            toast.info("Awaiting wallet signature...");
        } else if (hash && !isConfirmed && !isConfirming) {
            setTxStatus('sending');
            setTransactionHashForModal(hash);
            toast.loading("Transaction sent, waiting for blockchain confirmation...", { id: 'tx-status' });
        } else if (isConfirming) {
            setTxStatus('confirming');
            setTransactionHashForModal(hash);
            toast.loading("Transaction confirming on blockchain...", { id: 'tx-status' });
        } else if (isConfirmed) {
            setTxStatus('success');
            setTransactionHashForModal(hash);
            toast.success("Blockchain transaction confirmed! Processing order...", { id: 'tx-status' });
            if (hash) {
                handlePostTransaction(hash);
            }
        } else if (isConfirmError) {
            setTxStatus('error');
            const errorMsg = confirmError?.message?.split('\n')[0] || "Blockchain transaction failed to confirm.";
            setTransactionError(errorMsg);
            setTransactionHashForModal(hash);
            toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
        } else {
            if (!['waitingForApprovalSignature', 'approving', 'approvalSuccess', 'approvalError'].includes(txStatus)) {
                setTxStatus('idle');
                setTransactionError(null);
                setBackendMessage(null);
                setTransactionHashForModal(undefined);
            }
        }
    }, [isWritePending, hash, isConfirming, isConfirmed, isWriteError, isConfirmError, writeError, confirmError, txStatus, handlePostTransaction, simulateWriteError]);

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
        // ONLY place to set showTransactionModal(true)
        setShowTransactionModal(true);
        setTransactionError(null);
        setBackendMessage(null);
        setApprovalError(null);

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
        if (amountNGN <= 0) {
            toast.error("Please enter a valid amount.");
            setTxStatus('error');
            return;
        }

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

        if (selectedCrypto.tokenType !== 0) { // If it's an ERC20 token (USDT or USDC)
            if (simulateApproveError) {
                const errorMsg = simulateApproveError.message?.split('\n')[0] || "Token approval simulation failed.";
                setApprovalError(errorMsg);
                setTransactionError(errorMsg);
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
            setTxStatus('waitingForApprovalSignature');
            try {
                writeApprove(simulateApproveData.request);
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
                setTxStatus('waitingForSignature');
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

    const handleCloseModal = useCallback(() => {
        setShowTransactionModal(false);
        setTxStatus('idle');
        setTransactionError(null);
        setBackendMessage(null);
        setTransactionHashForModal(undefined);
        setApprovalError(null);
    }, []);

    const isFormValid = Boolean(crypto && provider && amount && phone && requestId && cryptoNeeded > 0);

    const isButtonDisabled = loading || isWritePending || isConfirming || txStatus === 'backendProcessing' || !isFormValid ||
                             isApprovePending || isApprovalConfirming || isSimulatingApprove || isSimulatingWrite || // Disable during simulation
                             simulateApproveError || simulateWriteError || // Disable if simulation fails
                             !isOnBaseChain || isSwitchingChain;

    return (
        <AuthGuard>
            <div className="container py-10 max-w-xl mx-auto">
                <BackToDashboard />
                <h1 className="text-3xl font-bold mb-4">Buy Airtime</h1>
                <p className="text-muted-foreground mb-8">
                    Instantly top up your mobile airtime using USDT, USDC, or ETH on Base
                    chain.
                </p>
                <Card>
                    <CardHeader>
                        <CardTitle>Crypto to Airtime</CardTitle>
                        <CardDescription>
                            Preview and calculate your airtime purchase with crypto
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
                                <Label htmlFor="provider">Network Provider</Label>
                                <Select value={provider} onValueChange={setProvider}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PROVIDERS.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount (NGN)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    min={100}
                                    max={50000}
                                    placeholder="Enter amount in Naira, minimum ₦100"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="e.g. 080*********"
                                    maxLength={11}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
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
                                <span>You will pay:</span>
                                <span>
                                    {crypto && amount && priceNGN ? (
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
                            isFormValid ? "Purchase Airtime" :
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
                errorMessage={transactionError || approvalError || simulateApproveError?.message || simulateWriteError?.message}
                backendMessage={backendMessage}
                requestId={requestId}
            />
        </AuthGuard>
    )
}
