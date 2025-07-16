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
import { parseEther, parseUnits, toBytes, toHex, Hex } from 'viem'; // Import toHex and Hex type
import { toast } from 'sonner';

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
	const [requestId, setRequestId] = useState<string | undefined>(undefined); // Allow requestId to be undefined initially
	const [txStatus, setTxStatus] = useState<'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error'>('idle');
	const [transactionError, setTransactionError] = useState<string | null>(null);

	const { connectWallet, authenticated, user } = usePrivy();
	const { isConnected, address } = useAccount();

	const selectedCrypto = CRYPTOS.find((c) => c.symbol === crypto)
	const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
	const amountNGN = Number(amount) || 0
	const cryptoNeeded = priceNGN ? amountNGN / priceNGN : 0

	// --- Wagmi Hook for Contract Interaction ---
	const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError } = useWriteContract();

	const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
		hash: hash as Hex, // Cast hash to Hex here, as it's enabled only when truthy
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

	// Handle transaction status feedback
	useEffect(() => {
		if (isWritePending) {
			setTxStatus('waitingForSignature');
			toast.info("Awaiting wallet signature...");
		} else if (hash) {
			setTxStatus('sending');
			toast.loading("Transaction sent, confirming on blockchain...", { id: 'tx-status' });
		} else if (isConfirming) {
			setTxStatus('confirming');
		} else if (isConfirmed) {
			setTxStatus('success');
			toast.success("Transaction confirmed!", { id: 'tx-status' });
			if (hash) { // Ensure hash is not undefined before passing to post-transaction handler
				handlePostTransaction(hash);
			}
		} else if (isWriteError || isConfirmError) {
			setTxStatus('error');
			const errorMsg = (writeError?.message || confirmError?.message || "Transaction failed").split('\n')[0];
			setTransactionError(errorMsg);
			toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
		} else {
			setTxStatus('idle');
			setTransactionError(null);
		}
	}, [isWritePending, hash, isConfirming, isConfirmed, isWriteError, isConfirmError, writeError, confirmError]);

	// Simplified: Ensure user is authenticated and Wagmi sees an address
	const ensureWalletConnected = async () => {
		if (!authenticated) {
			toast.error("Please log in to proceed.");
			await connectWallet(); // Attempt to trigger Privy login
			return false;
		}
		if (!address) {
			toast.error("No wallet found. Please ensure a wallet is connected via Privy.");
			await connectWallet(); // Attempt to make Privy expose a wallet
			return false;
		}
		return true;
	};

	const handlePurchase = async () => {
		setTransactionError(null);
		setTxStatus('waitingForSignature');

		const walletConnected = await ensureWalletConnected();
		if (!walletConnected) return;

		if (!address) {
			toast.error("Wallet address not found after connection. Please refresh and try again.");
			return;
		}
        if (!requestId) {
            toast.error("Request ID not generated. Please fill all form details.");
            return;
        }

		// Prepare transaction arguments
		const tokenAmount = selectedCrypto
			? parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals)
			: BigInt(0);

		const value = selectedCrypto?.symbol === 'ETH' && cryptoNeeded > 0
			? parseEther(cryptoNeeded.toFixed(18))
			: BigInt(0);

		// FIX: Convert toBytes to toHex for contract argument
		const bytes32RequestId: Hex = toHex(toBytes(requestId), { size: 32 }); // Convert string to bytes32 hex

		try {
			writeContract({
				address: CONTRACT_ADDRESS,
				abi: CONTRACT_ABI,
				functionName: 'createOrder',
				args: [
					bytes32RequestId,
					selectedCrypto ? selectedCrypto.tokenType : 0, // FIX: Pass as number if ABI expects number
					tokenAmount,
				],
				value: value,
			});
		} catch (error: any) {
			console.error("Error sending transaction:", error);
			setTransactionError(error.message || "Failed to send transaction.");
			setTxStatus('error');
			toast.error(error.message || "Failed to send transaction.");
		}
	};

	const handlePostTransaction = async (transactionHash: Hex) => { // Type transactionHash as Hex
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

			toast.success("Airtime delivered successfully!");
			setCrypto("");
			setProvider("");
			setAmount("");
			setPhone("");
			setRequestId(undefined); // Reset requestId to undefined to trigger regeneration
		} catch (backendError: any) {
			console.error("Backend API call failed:", backendError);
			toast.error(`Backend processing failed: ${backendError.message}. Please contact support with Request ID: ${requestId}`);
		}
	};

	const isFormValid = Boolean(crypto && provider && amount && phone && requestId && cryptoNeeded > 0);
	const isButtonDisabled = loading || isWritePending || isConfirming || !isFormValid;

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
							{transactionError && (
								<div className="text-red-500 text-sm mt-2">
									Transaction Error: {transactionError}
								</div>
							)}
						</div>
						<Button
							className="w-full"
							onClick={handlePurchase}
							// disabled={isButtonDisabled}
						>
							{txStatus === 'waitingForSignature' && "Awaiting Signature..."}
							{txStatus === 'sending' && "Sending Transaction..."}
							{txStatus === 'confirming' && "Confirming Transaction..."}
							{txStatus === 'success' && "Purchase Successful!"}
							{txStatus === 'error' && "Try Again"}
							{txStatus === 'idle' && isFormValid && "Purchase Airtime"}
							{!isFormValid && "Fill all details"}
						</Button>
					</CardContent>
				</Card>
			</div>
		</AuthGuard>
	)
}