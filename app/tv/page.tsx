// app/tv/page.tsx
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

const TV_PROVIDERS = [
    { id: "dstv", name: "DStv" },
    { id: "gotv", name: "GOtv" },
    { id: "startimes", name: "Startimes" },
];

// Dummy data for TV Plans - Replace with actual API fetches based on provider
const TV_PLANS: { [key: string]: { code: string; name: string; amount: number; description: string }[] } = {
    "dstv": [
        { code: "dstv-padi", name: "DStv Padi (₦1,850)", amount: 1850, description: "DStv Padi Bouquet" },
        { code: "dstv-yanga", name: "DStv Yanga (₦2,800)", amount: 2800, description: "DStv Yanga Bouquet" },
        { code: "dstv-confam", name: "DStv Confam (₦3,600)", amount: 3600, description: "DStv Confam Bouquet" },
    ],
    "gotv": [
        { code: "gotv-smallie", name: "GOtv Smallie (₦1,100)", amount: 1100, description: "GOtv Smallie" },
        { code: "gotv-jinja", name: "GOtv Jinja (₦2,050)", amount: 2050, description: "GOtv Jinja" },
        { code: "gotv-jolly", name: "GOtv Jolly (₦3,100)", amount: 3100, description: "GOtv Jolly" },
    ],
    "startimes": [
        { code: "startimes-nova", name: "Startimes Nova (₦900)", amount: 900, description: "Startimes Nova" },
        { code: "startimes-basic", name: "Startimes Basic (₦1,700)", amount: 1700, description: "Startimes Basic" },
        { code: "startimes-classic", name: "Startimes Classic (₦2,500)", amount: 2500, description: "Startimes Classic" },
    ],
};

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

export default function TVPage() {
	const [crypto, setCrypto] = useState("")
	const [provider, setProvider] = useState("")
	const [selectedPlanCode, setSelectedPlanCode] = useState("")
	const [smartcardNumber, setSmartcardNumber] = useState("")
	const [phone, setPhone] = useState("") // Phone can be optional for TV payments, but good for receipt
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
	const selectedPlan = TV_PLANS[provider]?.find(p => p.code === selectedPlanCode);
    const amountNGN = selectedPlan ? selectedPlan.amount : 0;
	const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
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

	useEffect(() => {
		// Only generate requestId if essential fields are filled and it's not already set
		if ((crypto || provider || selectedPlanCode || smartcardNumber) && !requestId) {
			setRequestId(generateRequestId())
		}
	}, [crypto, provider, selectedPlanCode, smartcardNumber, requestId])


	// Handle blockchain transaction status feedback and modal display
	useEffect(() => {
		if (isWritePending) {
			setTxStatus('waitingForSignature');
			setShowTransactionModal(true);
			setTransactionHashForModal(undefined);
			setTransactionError(null); // Clear previous errors
			setBackendMessage(null); // Clear previous backend messages
			toast.info("Awaiting wallet signature...");
		} else if (hash) {
			setTxStatus('sending');
			setShowTransactionModal(true);
			setTransactionHashForModal(hash);
			toast.loading("Transaction sent, confirming on blockchain...", { id: 'tx-status' });
		} else if (isConfirming) {
			setTxStatus('confirming');
			setShowTransactionModal(true);
		} else if (isConfirmed) {
			setTxStatus('success'); // Blockchain TX is successful, now trigger backend call
			setShowTransactionModal(true);
			toast.success("Blockchain transaction confirmed! Processing order...", { id: 'tx-status' });
			if (hash) {
				handlePostTransaction(hash); // Call backend here
			}
		} else if (isWriteError || isConfirmError) {
			setTxStatus('error'); // Blockchain-level error
			const errorMsg = (writeError?.message || confirmError?.message || "Blockchain transaction failed").split('\n')[0];
			setTransactionError(errorMsg);
			setShowTransactionModal(true);
			toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
		} else {
			setTxStatus('idle'); // Default idle state
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
			const backendResponse = await fetch('/api/tv', { // Changed to /api/tv
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					requestId,
					smartcard_number: smartcardNumber,
					serviceID: provider, // Use provider ID as serviceID
					variation_code: selectedPlanCode,
					amount: amountNGN,
					phone, // Optional for TV, but good to send if collected
					cryptoUsed: cryptoNeeded,
					cryptoSymbol: selectedCrypto?.symbol,
					transactionHash
				}),
			});

			if (!backendResponse.ok) {
				const errorData = await backendResponse.json();
				throw new Error(errorData.message || "Failed to pay TV subscription via backend.");
			}

			setTxStatus('backendSuccess');
			setBackendMessage("TV subscription paid successfully!");
			toast.success("TV subscription paid successfully!", { id: 'backend-status' });
			// Reset form for next transaction
			setCrypto("");
			setProvider("");
			setSelectedPlanCode("");
			setSmartcardNumber("");
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

	const isFormValid = Boolean(crypto && provider && selectedPlanCode && smartcardNumber && requestId && cryptoNeeded > 0);
	// FIX: Corrected the disabled prop syntax
	const isButtonDisabled = loading || isWritePending || isConfirming || txStatus === 'backendProcessing' || !isFormValid;

	return (
		<AuthGuard>
			<div className="container py-10 max-w-xl mx-auto">
				<BackToDashboard />
				<h1 className="text-3xl font-bold mb-4">Pay TV Subscription</h1>
				<p className="text-muted-foreground mb-8">
					Instantly renew your TV subscription using USDT, USDC, or ETH on Base
					chain.
				</p>
				<Card>
					<CardHeader>
						<CardTitle>Crypto to TV Subscription</CardTitle>
						<CardDescription>
							Preview and calculate your TV subscription payment with crypto
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
								<Label htmlFor="provider">TV Provider</Label>
								<Select value={provider} onValueChange={(value) => {
                                    setProvider(value);
                                    setSelectedPlanCode(""); // Reset plan when provider changes
                                }}>
									<SelectTrigger>
										<SelectValue placeholder="Select provider" />
									</SelectTrigger>
									<SelectContent>
										{TV_PROVIDERS.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
                            {provider && TV_PLANS[provider] && TV_PLANS[provider].length > 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="plan">Subscription Plan</Label>
                                    <Select value={selectedPlanCode} onValueChange={setSelectedPlanCode}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TV_PLANS[provider].map((plan) => (
                                                <SelectItem key={plan.code} value={plan.code}>
                                                    {plan.name} - ₦{plan.amount.toLocaleString()}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
							<div className="space-y-2">
								<Label htmlFor="smartcardNumber">Smartcard Number</Label>
								<Input
									id="smartcardNumber"
									type="text"
									placeholder="Enter smartcard number"
									value={smartcardNumber}
									onChange={(e) => setSmartcardNumber(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="phone">Phone Number (Optional for receipt)</Label>
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
								<span>Amount (NGN):</span>
								<span>
                                    {amountNGN > 0 ? `₦${amountNGN.toLocaleString()}` : "--"}
                                </span>
							</div>
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
							{txStatus === 'waitingForSignature' && "Awaiting Signature..."}
							{txStatus === 'sending' && "Sending Transaction..."}
							{txStatus === 'confirming' && "Confirming Blockchain..."}
							{txStatus === 'success' && "Blockchain Confirmed!"}
							{txStatus === 'backendProcessing' && "Processing Order..."}
							{txStatus === 'backendSuccess' && "Payment Successful!"}
							{txStatus === 'backendError' && "Payment Failed - Try Again"}
							{txStatus === 'error' && "Blockchain Failed - Try Again"}
							{txStatus === 'idle' && isFormValid && "Pay Subscription"}
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