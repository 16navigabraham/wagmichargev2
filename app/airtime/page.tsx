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
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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

    // Wagmi Hooks for MAIN PAYMENT Transaction
    const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
        hash: hash as Hex,
        query: {
            enabled: Boolean(hash),
            refetchInterval: 1000,
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
                    transactionHash
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
            // Removed setShowTransactionModal(true);
            setTransactionHashForModal(undefined);
            setTransactionError(null);
            setBackendMessage(null);
            setApprovalError(null);
            toast.info("Awaiting token approval signature...");
        } else if (approveHash && !isApprovalTxConfirmed && !isApprovalConfirming) {
            setTxStatus('sending');
            // Removed setShowTransactionModal(true);
            setTransactionHashForModal(approveHash);
            toast.loading("Token approval sent, waiting for confirmation...", { id: 'approval-status' });
        } else if (isApprovalConfirming) {
            setTxStatus('approving');
            // Removed setShowTransactionModal(true);
            setTransactionHashForModal(approveHash);
            toast.loading("Token approval confirming on blockchain...", { id: 'approval-status' });
        } else if (isApprovalTxConfirmed) {
            setTxStatus('approvalSuccess');
            setApprovalError(null);
            // Changed message to reflect unlimited approval
            toast.success("Token approved for unlimited spending! Proceeding with payment...", { id: 'approval-status' });
            console.log("Approval: Blockchain confirmed! Initiating main transaction...");

            const initiateMainTransaction = setTimeout(() => {
                if (selectedCrypto) {
                    // Use a higher precision for toFixed before parseUnits for tokenAmount
                    const tokenAmount = parseUnits(cryptoNeeded.toFixed(18), selectedCrypto.decimals); // Increased precision
                    const value = selectedCrypto.symbol === 'ETH' && cryptoNeeded > 0
                        ? parseEther(cryptoNeeded.toFixed(18))
                        : BigInt(0);
                    const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 });

                    // Debugging logs for contract call parameters
                    console.log("--- Initiating Main Contract Call (after approval) ---");
                    console.log("RequestId (bytes32):", bytes32RequestId);
                    console.log("TokenType:", selectedCrypto.tokenType);
                    console.log("TokenAmount (parsed):", tokenAmount.toString());
                    console.log("Value (for ETH, 0 for ERC20):", value.toString());
                    console.log("Selected Crypto:", selectedCrypto.symbol);
                    console.log("Crypto Needed (float):", cryptoNeeded);
                    console.log("Selected Crypto Decimals:", selectedCrypto.decimals);
                    console.log("----------------------------------------------------");

                    try {
                        setTxStatus('waitingForSignature');
                        writeContract({
                            address: CONTRACT_ADDRESS,
                            abi: CONTRACT_ABI,
                            functionName: 'createOrder',
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
            }, 500);

            return () => clearTimeout(initiateMainTransaction);

        } else if (isApproveError || isApprovalConfirmError) {
            setTxStatus('approvalError');
            const errorMsg = (approveWriteError?.message || approveConfirmError?.message || "Token approval failed").split('\n')[0];
            setApprovalError(errorMsg);
            setTransactionError(errorMsg);
            toast.error(`Approval failed: ${errorMsg}`, { id: 'approval-status' });
        }
    }, [isApprovePending, approveHash, isApprovalTxConfirmed, isApprovalConfirming, isApproveError, isApprovalConfirmError, approveWriteError, approveConfirmError, writeContract, selectedCrypto, cryptoNeeded, requestId]);


    // Effect to monitor main transaction status
    useEffect(() => {
        if (['waitingForApprovalSignature', 'approving', 'approvalSuccess'].includes(txStatus)) {
            return;
        }

        if (isWriteError) {
            setTxStatus('error');
            const errorMsg = writeError?.message?.split('\n')[0] || "Wallet transaction failed or was rejected.";
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
    }, [isWritePending, hash, isConfirming, isConfirmed, isWriteError, isConfirmError, writeError, confirmError, txStatus, handlePostTransaction]);

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

        // For the main contract call, use the exact amount needed.
        const tokenAmountForOrder = parseUnits(cryptoNeeded.toFixed(18), selectedCrypto.decimals);
        // For approval, use the maximum uint256 value for unlimited approval.
        const unlimitedApprovalAmount = BigInt(2**256 - 1); // Represents type(uint256).max

        const value = selectedCrypto.symbol === 'ETH' && cryptoNeeded > 0
            ? parseEther(cryptoNeeded.toFixed(18))
            : BigInt(0);

        const bytes32RequestId: Hex = toHex(toBytes(requestId), { size: 32 });

        // Debugging logs for contract call parameters
        console.log("--- Initiating Contract Call ---");
        console.log("RequestId (bytes32):", bytes32RequestId);
        console.log("TokenType:", selectedCrypto.tokenType);
        console.log("TokenAmount for Order (parsed):", tokenAmountForOrder.toString()); // Log as string to see full BigInt
        console.log("Value (for ETH, 0 for ERC20):", value.toString()); // Log as string to see full BigInt
        console.log("Selected Crypto:", selectedCrypto.symbol);
        console.log("Crypto Needed (float):", cryptoNeeded);
        console.log("Selected Crypto Decimals:", selectedCrypto.decimals);
        console.log("--------------------------------");

        if (selectedCrypto.tokenType !== 0) { // If it's an ERC20 token (USDT or USDC)
            toast.info("Approving token spend for this transaction...");
            setTxStatus('waitingForApprovalSignature');
            try {
                if (selectedCrypto.contract) {
                    writeApprove({
                        abi: ERC20_ABI,
                        address: selectedCrypto.contract as Hex,
                        functionName: 'approve',
                        args: [CONTRACT_ADDRESS, unlimitedApprovalAmount], // MODIFICATION: Use unlimitedApprovalAmount here
                    });
                } else {
                    toast.error("Selected crypto has no contract address for approval.");
                    setTxStatus('error');
                    return;
                }
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
            try {
                setTxStatus('waitingForSignature');
                writeContract({
                    address: CONTRACT_ADDRESS,
                    abi: CONTRACT_ABI,
                    functionName: 'createOrder',
                    args: [
                        bytes32RequestId,
                        selectedCrypto.tokenType,
                        tokenAmountForOrder, // Use the exact amount for the order
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
                             isApprovePending || isApprovalConfirming ||
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
                errorMessage={transactionError || approvalError}
                backendMessage={backendMessage}
                requestId={requestId}
            />
        </AuthGuard>
    )
}
