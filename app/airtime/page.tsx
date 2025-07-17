// app/airtime/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import BackToDashboard from '@/components/BackToDashboard'
import AuthGuard from "@/components/AuthGuard"
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { parseEther, parseUnits, toBytes, toHex, Hex } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal"; // Import the modal

const CRYPTOS = [
	{ symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", tokenType: 0, decimals: 18 },
	{ symbol: "USDT", name: "Tether", coingeckoId: "tether", tokenType: 1, decimals: 6 },
	{ symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", tokenType: 2, decimals: 6 },
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
	
	// Combined transaction status state
	const [txStatus, setTxStatus] = useState<'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' | 'backendProcessing' | 'backendSuccess' | 'backendError'>('idle');
	const [transactionError, setTransactionError] = useState<string | null>(null);
	const [backendMessage, setBackendMessage] = useState<string | null>(null); // New state for backend message
	const [showTransactionModal, setShowTransactionModal] = useState(false);
	const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);

	const { connectWallet, authenticated, user } = usePrivy();
	const { isConnected, address } = useAccount();

	const selectedCrypto = CRYPTOS.find((c) => c.symbol === crypto)
	const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
	const amountNGN = Number(amount) || 0
	const cryptoNeeded = priceNGN ? amountNGN / priceNGN : 0

	// --- Wagmi Hook for Contract Interaction ---
	const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError } = useWriteContract();

	const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
		hash: hash as Hex,
		query: {
			enabled: Boolean(hash),
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
		}
	}, [crypto, provider, amount, phone, requestId])

	// Handle transaction status feedback and modal display
	useEffect(() => {
        // Handle immediate writeContract errors (e.g., user rejected, simulation failed)
        if (isWriteError) {
            setTxStatus('error');
            const errorMsg = writeError?.message?.split('\n')[0] || "Wallet transaction failed or was rejected.";
            setTransactionError(errorMsg);
            setShowTransactionModal(true);
            toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
            return; // Exit early if there's a write error
        }

        if (isWritePending) {
            setTxStatus('waitingForSignature');
            setShowTransactionModal(true);
            setTransactionHashForModal(undefined);
            setTransactionError(null);
            setBackendMessage(null);
            toast.info("Awaiting wallet signature...");
        } else if (hash) {
            // Once we have a hash, we're in the 'sending' or 'confirming' phase
            if (isConfirming) {
                setTxStatus('confirming');
                setShowTransactionModal(true);
                toast.loading("Transaction sent, confirming on blockchain...", { id: 'tx-status' });
            } else if (isConfirmed) {
                setTxStatus('success');
                setShowTransactionModal(true);
                toast.success("Blockchain transaction confirmed! Processing order...", { id: 'tx-status' });
                // IMPORTANT: Call your backend post-transaction logic here
                if (hash) {
                    handlePostTransaction(hash); // Ensure this function is defined in each page
                }
            } else if (isConfirmError) { // Handle errors during transaction receipt
                setTxStatus('error');
                const errorMsg = confirmError?.message?.split('\n')[0] || "Blockchain transaction failed to confirm.";
                setTransactionError(errorMsg);
                setShowTransactionModal(true);
                toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
            } else {
                // If hash exists but not confirming, confirmed, or error, it's just sent
                setTxStatus('sending'); // Set to sending initially once hash is available
                setShowTransactionModal(true);
                setTransactionHashForModal(hash);
                toast.loading("Transaction sent, waiting for blockchain confirmation...", { id: 'tx-status' });
            }
        } else {
            // No hash, no pending write, no error means idle
            setTxStatus('idle');
            setTransactionError(null);
            setBackendMessage(null);
            setTransactionHashForModal(undefined);
        }
    }, [isWritePending, hash, isConfirming, isConfirmed, isWriteError, isConfirmError, writeError, confirmError]);

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
		return true;
	};

	const handlePurchase = async () => {
		setTransactionError(null);
		setBackendMessage(null); // Clear backend message on new purchase attempt
		setTxStatus('waitingForSignature'); // Set status to trigger modal early

		const walletConnected = await ensureWalletConnected();
		if (!walletConnected) {
			setTxStatus('idle'); // Reset if connection fails
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

		const tokenAmount = selectedCrypto
			? parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals)
			: BigInt(0);

		const value = selectedCrypto?.symbol === 'ETH' && cryptoNeeded > 0
			? parseEther(cryptoNeeded.toFixed(18))
			: BigInt(0);

		const bytes32RequestId: Hex = toHex(toBytes(requestId), { size: 32 });

		try {
			writeContract({
				address: CONTRACT_ADDRESS,
				abi: CONTRACT_ABI,
				functionName: 'createOrder',
				args: [
					bytes32RequestId,
					selectedCrypto ? selectedCrypto.tokenType : 0,
					tokenAmount,
				],
				value: value,
			});
		} catch (error: any) {
			console.error("Error sending transaction:", error);
			// This catch block handles immediate errors before the transaction is sent (e.g., user rejects in wallet)
			const errorMsg = error.message || "Failed to send transaction.";
			setTransactionError(errorMsg);
			setTxStatus('error');
			toast.error(errorMsg);
		}
	};

	const handlePostTransaction = async (transactionHash: Hex) => {
		setTxStatus('backendProcessing'); // Set status for backend processing
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
	};

	const handleCloseModal = () => {
		setShowTransactionModal(false);
		// Reset all transaction states when modal is closed, especially after success or error
		setTxStatus('idle');
		setTransactionError(null);
		setBackendMessage(null);
		setTransactionHashForModal(undefined);
	};

	const isFormValid = Boolean(crypto && provider && amount && phone && requestId && cryptoNeeded > 0);
	// FIX: Corrected the disabled prop syntax
	const isButtonDisabled = loading || isWritePending || isConfirming || txStatus === 'backendProcessing' || !isFormValid;

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
							{/* Removed direct error display here as modal will handle all errors */}
						</div>
						<Button
							className="w-full"
							onClick={handlePurchase}
							// disabled={isButtonDisabled}
						>
							{txStatus === 'waitingForSignature' && "Awaiting Signature..."}
							{txStatus === 'sending' && "Sending Transaction..."}
							{txStatus === 'confirming' && "Confirming Blockchain..."}
							{txStatus === 'success' && "Blockchain Confirmed!"}
							{txStatus === 'backendProcessing' && "Processing Order..."}
							{txStatus === 'backendSuccess' && "Payment Successful!"}
							{txStatus === 'backendError' && "Payment Failed - Try Again"}
							{txStatus === 'error' && "Blockchain Failed - Try Again"}
							{txStatus === 'idle' && isFormValid && "Purchase Airtime"}
							{!isFormValid && "Fill all details"}
						</Button>
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