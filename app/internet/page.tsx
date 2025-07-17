// app/internet/page.tsx
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

// Dummy data for Internet Providers and Plans - Replace with actual API fetches
const INTERNET_PROVIDERS = [
	{ id: "mtn-data", name: "MTN Data" },
	{ id: "airtel-data", name: "Airtel Data" },
	{ id: "glo-data", name: "Glo Data" },
	{ id: "9mobile-data", name: "9mobile Data" },
    { id: "smile-data", name: "Smile (Data)" }, // Example for Smile
    { id: "spectranet-data", name: "Spectranet (Data)" }, // Example for Spectranet
]

// In a real application, you would fetch these dynamically based on the selected provider
const DATA_PLANS: { [key: string]: { code: string; name: string; amount: number; description: string }[] } = {
    "mtn-data": [
        { code: "mtn-100mb-1day", name: "100MB - ₦100 (1 Day)", amount: 100, description: "MTN 100MB for 1 Day" },
        { code: "mtn-1gb-7days", name: "1GB - ₦300 (7 Days)", amount: 300, description: "MTN 1GB for 7 Days" },
        { code: "mtn-5gb-30days", name: "5GB - ₦1500 (30 Days)", amount: 1500, description: "MTN 5GB for 30 Days" },
    ],
    "airtel-data": [
        { code: "airtel-50mb-1day", name: "50MB - ₦50 (1 Day)", amount: 50, description: "Airtel 50MB for 1 Day" },
        { code: "airtel-2gb-7days", name: "2GB - ₦500 (7 Days)", amount: 500, description: "Airtel 2GB for 7 Days" },
        { code: "airtel-10gb-30days", name: "10GB - ₦2500 (30 Days)", amount: 2500, description: "Airtel 10GB for 30 Days" },
    ],
    // Add plans for other providers
    "glo-data": [],
    "9mobile-data": [],
    "smile-data": [],
    "spectranet-data": [],
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

export default function InternetPage() {
	const [crypto, setCrypto] = useState("")
	const [provider, setProvider] = useState("")
	const [selectedPlanCode, setSelectedPlanCode] = useState("")
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
	const selectedPlan = DATA_PLANS[provider]?.find(p => p.code === selectedPlanCode);
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
		if ((crypto || provider || selectedPlanCode || phone) && !requestId) {
			setRequestId(generateRequestId())
		}
	}, [crypto, provider, selectedPlanCode, phone, requestId])

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
			const backendResponse = await fetch('/api/data', { // Changed to /api/data
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					requestId,
					phone, // Assuming customerID is phone for data
					serviceID: provider, // Use provider ID as serviceID
					variation_code: selectedPlanCode,
                    amount: amountNGN,
					cryptoUsed: cryptoNeeded,
					cryptoSymbol: selectedCrypto?.symbol,
					transactionHash
				}),
			});

			if (!backendResponse.ok) {
				const errorData = await backendResponse.json();
				throw new Error(errorData.message || "Failed to deliver data via backend.");
			}

			setTxStatus('backendSuccess');
			setBackendMessage("Data subscription delivered successfully!");
			toast.success("Data subscription delivered successfully!", { id: 'backend-status' });
			setCrypto("");
			setProvider("");
			setSelectedPlanCode("");
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

	const isFormValid = Boolean(crypto && provider && selectedPlanCode && phone && requestId && cryptoNeeded > 0);
	// FIX: Corrected the disabled prop syntax
	const isButtonDisabled = loading || isWritePending || isConfirming || txStatus === 'backendProcessing' || !isFormValid;

	return (
		<AuthGuard>
			<div className="container py-10 max-w-xl mx-auto">
				<BackToDashboard />
				<h1 className="text-3xl font-bold mb-4">Buy Data Subscription</h1>
				<p className="text-muted-foreground mb-8">
					Instantly subscribe to data bundles using USDT, USDC, or ETH on Base
					chain.
				</p>
				<Card>
					<CardHeader>
						<CardTitle>Crypto to Data</CardTitle>
						<CardDescription>
							Preview and calculate your data purchase with crypto
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
								<Select value={provider} onValueChange={(value) => {
                                    setProvider(value);
                                    setSelectedPlanCode(""); // Reset plan when provider changes
                                }}>
									<SelectTrigger>
										<SelectValue placeholder="Select provider" />
									</SelectTrigger>
									<SelectContent>
										{INTERNET_PROVIDERS.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
                            {provider && DATA_PLANS[provider] && DATA_PLANS[provider].length > 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="plan">Data Plan</Label>
                                    <Select value={selectedPlanCode} onValueChange={setSelectedPlanCode}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select data plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DATA_PLANS[provider].map((plan) => (
                                                <SelectItem key={plan.code} value={plan.code}>
                                                    {plan.name} - ₦{plan.amount.toLocaleString()}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
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
								<span>Amount (NGN):</span>
								<span>
                                    {selectedPlan ? `₦${selectedPlan.amount.toLocaleString()}` : "--"}
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
							{txStatus === 'idle' && isFormValid && "Purchase Data"}
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
                requestId={requestId} // Pass requestId to modal
			/>
		</AuthGuard>
	)
}