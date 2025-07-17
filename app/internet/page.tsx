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
import { parseEther, parseUnits, toBytes, toHex, Hex } from 'viem'; // Import toHex and Hex type
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal"; // Import the modal

const CRYPTOS = [
	{ symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", tokenType: 0, decimals: 18 },
	{ symbol: "USDT", name: "Tether", coingeckoId: "tether", tokenType: 1, decimals: 6 },
	{ symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", tokenType: 2, decimals: 6 },
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
	const [requestId, setRequestId] = useState<string | undefined>(undefined); // Allow requestId to be undefined initially
	
    // --- START OF ADDITIONS: Transaction States ---
	const [txStatus, setTxStatus] = useState<'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' | 'backendProcessing' | 'backendSuccess' | 'backendError'>('idle');
	const [transactionError, setTransactionError] = useState<string | null>(null);
    const [backendMessage, setBackendMessage] = useState<string | null>(null); // New state for backend message
	const [showTransactionModal, setShowTransactionModal] = useState(false);
	const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);
    // --- END OF ADDITIONS ---

	const { connectWallet, authenticated, user } = usePrivy();
	const { isConnected, address } = useAccount();

	const selectedCrypto = CRYPTOS.find((c) => c.symbol === crypto)
	const selectedPlan = plans.find((p) => p.variation_code === plan)
	const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
	const amountNGN = selectedPlan ? Number(selectedPlan.variation_amount) : 0
	const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0

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
		}
	}, [crypto, provider, plan, customerID, requestId])

    // --- START OF ADDITIONS: Handle transaction status feedback and modal display ---
	useEffect(() => {
		if (isWritePending) {
			setTxStatus('waitingForSignature');
			setShowTransactionModal(true); // Show modal
			setTransactionHashForModal(undefined); // Clear hash
			setTransactionError(null); // Clear previous errors
            setBackendMessage(null); // Clear previous backend messages
			toast.info("Awaiting wallet signature...");
		} else if (hash) {
			setTxStatus('sending');
			setShowTransactionModal(true); // Show modal
			setTransactionHashForModal(hash);
			toast.loading("Transaction sent, confirming on blockchain...", { id: 'tx-status' });
		} else if (isConfirming) {
			setTxStatus('confirming');
			setShowTransactionModal(true); // Show modal
		} else if (isConfirmed) {
			setTxStatus('success'); // Blockchain TX is successful, now trigger backend call
			setShowTransactionModal(true); // Keep modal open
			toast.success("Blockchain transaction confirmed! Processing order...", { id: 'tx-status' });
			if (hash) {
				handlePostTransaction(hash); // Call backend here
			}
		} else if (isWriteError || isConfirmError) {
			setTxStatus('error'); // Blockchain-level error
			const errorMsg = (writeError?.message || confirmError?.message || "Blockchain transaction failed").split('\n')[0];
			setTransactionError(errorMsg);
			setShowTransactionModal(true); // Show modal with error
			toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
		} else {
			setTxStatus('idle'); // Default idle state
			setTransactionError(null);
            setBackendMessage(null);
			setTransactionHashForModal(undefined);
            setShowTransactionModal(false); // Hide modal if idle and no active transaction
		}
	}, [isWritePending, hash, isConfirming, isConfirmed, isWriteError, isConfirmError, writeError, confirmError]);
    // --- END OF ADDITIONS ---

	// Simplified: Ensure user is authenticated and Wagmi sees an address
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
        if (!selectedPlan) {
            toast.error("Please select a data plan.");
            setTxStatus('error');
            return;
        }


		// Prepare transaction arguments
		const tokenAmount = selectedCrypto
			? parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals)
			: BigInt(0);

		const value = selectedCrypto?.symbol === 'ETH' && cryptoNeeded > 0
			? parseEther(cryptoNeeded.toFixed(18))
			: BigInt(0);

		const bytes32RequestId: Hex = toHex(toBytes(requestId), { size: 32 }); // Convert string to bytes32 hex

		try {
			writeContract({
				address: CONTRACT_ADDRESS,
				abi: CONTRACT_ABI,
				functionName: 'createOrder',
				args: [
					bytes32RequestId,
					selectedCrypto ? selectedCrypto.tokenType : 0, // Pass as number if ABI expects number
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
        setTxStatus('backendProcessing'); // Set status for backend processing
        setBackendMessage("Processing your order...");
        toast.loading("Processing order with VTpass...", { id: 'backend-status' });

		try {
			const orderData = {
				requestId,
				crypto: selectedCrypto?.symbol,
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
			const backendResponse = await fetch('/api/internet', { // Changed to /api/internet for consistency
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					requestId,
					phone: customerID, // VTpass often uses 'phone' for customer ID in data services
					serviceID: provider,
					variation_code: plan,
					amount: amountNGN,
					cryptoUsed: cryptoNeeded,
					cryptoSymbol: selectedCrypto?.symbol,
					transactionHash
				}),
			});

            const responseData = await backendResponse.json(); // Parse JSON for both success and error

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
			setRequestId(undefined); // Reset requestId to undefined to trigger regeneration
		} catch (backendError: any) {
			console.error("Backend API call failed:", backendError);
            setTxStatus('backendError');
            const msg = `Backend processing failed: ${backendError.message}. Please contact support with Request ID: ${requestId}`;
            setBackendMessage(msg);
			toast.error(msg, { id: 'backend-status' });
		}
	};

    // --- START OF ADDITIONS: handleCloseModal ---
    const handleCloseModal = () => {
        setShowTransactionModal(false);
        // Reset all transaction states when modal is closed, especially after success or error
        setTxStatus('idle');
        setTransactionError(null);
        setBackendMessage(null);
        setTransactionHashForModal(undefined);
    };
    // --- END OF ADDITIONS ---

	const providersToShow = availableProviders.length > 0 ? availableProviders : [];

	const isFormValid = Boolean(crypto && provider && plan && customerID && requestId && cryptoNeeded > 0);
	// --- START OF ADDITIONS: Updated isButtonDisabled logic ---
	const isButtonDisabled = loading || loadingPlans || isWritePending || isConfirming || txStatus === 'backendProcessing' || !isFormValid;
    // --- END OF ADDITIONS ---

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
							{/* Removed direct transactionError display here as modal will handle all errors */}
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
                            {txStatus === 'idle' && isFormValid && "Purchase Internet Data"}
                            {!isFormValid && "Fill all details"}
						</Button>
					</CardContent>
				</Card>
			</div>
            {/* Transaction Status Modal */}
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