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
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'; // Added useReadContract
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

	// --- START OF MODIFICATIONS: Transaction and Approval States ---
	// Corrected txStatus type to include all possible states
	const [txStatus, setTxStatus] = useState<'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' | 'backendProcessing' | 'backendSuccess' | 'backendError' | 'waitingForApprovalSignature' | 'approving' | 'approvalSuccess' | 'approvalError'>('idle');
	const [transactionError, setTransactionError] = useState<string | null>(null);
	const [backendMessage, setBackendMessage] = useState<string | null>(null);
	const [showTransactionModal, setShowTransactionModal] = useState(false);
	const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);

	// New states for ERC20 approval process
	const [currentAllowance, setCurrentAllowance] = useState<bigint | undefined>(undefined);
	const [isApprovalConfirmed, setIsApprovalConfirmed] = useState(false); // True if approval tx succeeded
	const [approvalError, setApprovalError] = useState<string | null>(null); // Error message for approval tx
	// --- END OF MODIFICATIONS: Transaction and Approval States ---


	const { connectWallet, authenticated, user } = usePrivy();
	const { isConnected, address } = useAccount();

	// --- START OF MODIFICATIONS: Network Enforcer Hook ---
	const { isOnBaseChain, isSwitchingChain, promptSwitchToBase } = useBaseNetworkEnforcer();
	// --- END OF MODIFICATIONS: Network Enforcer Hook ---

	const selectedCrypto = CRYPTOS.find((c) => c.symbol === crypto)
	const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
	const amountNGN = Number(amount) || 0
	const cryptoNeeded = priceNGN ? amountNGN / priceNGN : 0

	// --- START OF MODIFICATIONS: Wagmi Hooks for Main Transaction and Approval ---
	const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError } = useWriteContract();

	const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
		hash: hash as Hex,
		query: {
			enabled: Boolean(hash),
		},
	});

	// Hook to read current allowance
	const { data: allowanceData, refetch: refetchAllowance, isLoading: isAllowanceLoading } = useReadContract({
		abi: ERC20_ABI,
		address: selectedCrypto?.contract ? selectedCrypto.contract as Hex : undefined, // Safely access contract
		functionName: 'allowance',
		args: address && CONTRACT_ADDRESS ? [address, CONTRACT_ADDRESS] : undefined, // Ensure args are defined
		query: {
			enabled: Boolean(selectedCrypto?.contract && address && CONTRACT_ADDRESS && selectedCrypto?.tokenType !== 0), // Only enabled for ERC20 tokens when address is present
			refetchInterval: 5000, // Refetch allowance periodically
		},
	});

	// Hook to write approve transaction
	const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending, isError: isApproveError, error: approveWriteError } = useWriteContract();

	// Hook to wait for approval transaction receipt
	const { isLoading: isApprovalConfirming, isSuccess: isApprovalTxConfirmed, isError: isApprovalConfirmError, error: approveConfirmError } = useWaitForTransactionReceipt({
		hash: approveHash as Hex,
		query: {
			enabled: Boolean(approveHash),
		},
	});
	// --- END OF MODIFICATIONS: Wagmi Hooks for Main Transaction and Approval ---

	useEffect(() => {
		setLoading(true)
		fetchPrices().then((data) => {
			setPrices(data)
			setLoading(false)
		})
	}, [])

	// Update currentAllowance state when allowanceData changes
	useEffect(() => {
		if (allowanceData !== undefined) {
			setCurrentAllowance(allowanceData);
		}
	}, [allowanceData]);

	// Generate requestId when user starts filling form
	useEffect(() => {
		if ((crypto || provider || amount || phone) && !requestId) {
			setRequestId(generateRequestId())
		} else if (!(crypto || provider || amount || phone) && requestId) {
			setRequestId(undefined); // Clear if form is empty
		}
	}, [crypto, provider, amount, phone, requestId])

    // Moved handlePostTransaction definition above its usage in useEffect
    const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
        setTxStatus('backendProcessing');
        setBackendMessage("Processing your order...");
        toast.loading("Processing order with VTpass...", { id: 'backend-status' });

        try {
            const orderData = {
                requestId,
                crypto: selectedCrypto?.symbol, // Safely access symbol
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
                    cryptoSymbol: selectedCrypto?.symbol, // Safely access symbol
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
            setIsApprovalConfirmed(false); // Reset approval state
            setCurrentAllowance(undefined); // Reset allowance
        } catch (backendError: any) {
            setTxStatus('backendError');
            const msg = `Backend processing failed: ${backendError.message}. Please contact support with Request ID: ${requestId}`;
            setBackendMessage(msg);
            console.error("Backend API call failed:", backendError);
            toast.error(msg, { id: 'backend-status' });
        }
    }, [requestId, selectedCrypto?.symbol, amountNGN, phone, cryptoNeeded, address, provider]); // Added specific dependencies for selectedCrypto

	// --- START OF MODIFICATIONS: Handle Transaction Status Feedback and Modal Display ---
	// Effect to monitor approval transaction status
	useEffect(() => {
		if (isApprovePending) {
			setTxStatus('waitingForApprovalSignature');
			setShowTransactionModal(true);
			setTransactionHashForModal(undefined); // Clear main tx hash
			setTransactionError(null);
			setBackendMessage(null);
			setApprovalError(null);
			toast.info("Awaiting token approval signature...");
		} else if (approveHash) {
			setTxStatus('approving');
			setShowTransactionModal(true);
			setTransactionHashForModal(approveHash); // Show approval hash in modal
			toast.loading("Token approval sent, waiting for confirmation...", { id: 'approval-status' });
		} else if (isApprovalTxConfirmed) {
			setTxStatus('approvalSuccess');
			setShowTransactionModal(true);
			setApprovalError(null); // Clear any previous approval errors
			setIsApprovalConfirmed(true); // Mark approval as successful
			refetchAllowance(); // Re-fetch allowance immediately after approval
			toast.success("Token approved! You can now proceed with payment.", { id: 'approval-status' });
		} else if (isApproveError || isApprovalConfirmError) {
			setTxStatus('approvalError');
			const errorMsg = (approveWriteError?.message || approveConfirmError?.message || "Token approval failed").split('\n')[0];
			setApprovalError(errorMsg);
			setTransactionError(errorMsg); // Use main error state for modal display
			setShowTransactionModal(true);
			setIsApprovalConfirmed(false); // Ensure approval is not marked as confirmed
			toast.error(`Approval failed: ${errorMsg}`, { id: 'approval-status' });
		}
	}, [isApprovePending, approveHash, isApprovalTxConfirmed, isApprovalConfirming, isApproveError, isApprovalConfirmError, approveWriteError, approveConfirmError, refetchAllowance]);


	// Effect to monitor main transaction status
	useEffect(() => {
		// Only run if an approval flow is active or just completed successfully/with error
		if (['waitingForApprovalSignature', 'approving', 'approvalSuccess', 'approvalError'].includes(txStatus)) {
			return;
		}

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
			setTransactionHashForModal(undefined); // Clear main tx hash
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
				if (hash) {
					handlePostTransaction(hash);
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
			// No hash, no pending write, no error means idle, but only if not in approval flow
			// This else block should only reset to idle if no other specific status is active
			if (!['waitingForApprovalSignature', 'approving', 'approvalSuccess', 'approvalError'].includes(txStatus)) {
				setTxStatus('idle');
				setTransactionError(null);
				setBackendMessage(null);
				setTransactionHashForModal(undefined);
			}
		}
	}, [isWritePending, hash, isConfirming, isConfirmed, isWriteError, isConfirmError, writeError, confirmError, txStatus, handlePostTransaction]); // Added txStatus to dependencies

	// --- END OF MODIFICATIONS: Handle Transaction Status Feedback and Modal Display ---

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
		setTransactionError(null);
		setBackendMessage(null);
		setApprovalError(null); // Clear approval errors on new purchase attempt
		setIsApprovalConfirmed(false); // Reset approval confirmation at start of new purchase

		const walletConnectedAndOnBase = await ensureWalletConnected();
		if (!walletConnectedAndOnBase) {
			setTxStatus('idle');
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

        // --- FIX: Add check for selectedCrypto here ---
        if (!selectedCrypto) {
            toast.error("Please select a cryptocurrency.");
            setTxStatus('error');
            return;
        }
        // --- END FIX ---

		const tokenAmount = parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals);

		const value = selectedCrypto.symbol === 'ETH' && cryptoNeeded > 0
			? parseEther(cryptoNeeded.toFixed(18))
			: BigInt(0);

		const bytes32RequestId: Hex = toHex(toBytes(requestId), { size: 32 });

		// --- START OF MODIFICATIONS: Token Approval Logic ---
		if (selectedCrypto.tokenType !== 0) { // If it's an ERC20 token (USDT or USDC)
			// Ensure allowance data is loaded before checking
			if (isAllowanceLoading) {
				toast.info("Checking token allowance, please wait...");
				setTxStatus('idle'); // Keep idle while loading allowance
				return;
			}

			// If allowance is insufficient
			if (currentAllowance === undefined || currentAllowance < tokenAmount) {
				toast.info("Approving token spend for the contract...");
				setTxStatus('waitingForApprovalSignature'); // Set initial status for approval
				try {
					// Ensure selectedCrypto.contract is not undefined before passing to writeApprove
					if (selectedCrypto.contract) {
						writeApprove({
							abi: ERC20_ABI,
							address: selectedCrypto.contract as Hex, // Token contract address
							functionName: 'approve',
							args: [CONTRACT_ADDRESS, tokenAmount], // Spender: your escrow contract, Amount: tokenAmount
						});
					} else {
						toast.error("Selected crypto has no contract address for approval.");
						setTxStatus('error');
						return;
					}
					// After initiating approval, stop here. The approval useEffect will handle next steps.
					return;
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
				// Allowance is sufficient, proceed with main transaction immediately
				setIsApprovalConfirmed(true);
			}
		} else {
			// If ETH, no approval needed, so mark approval as confirmed
			setIsApprovalConfirmed(true);
		}

		// Only proceed with createOrder if approval is confirmed (or not needed for ETH)
		if (!isApprovalConfirmed) {
			toast.error("Token approval is required before proceeding with the payment.");
			setTxStatus('idle'); // Reset to idle or a specific pending approval state
			return;
		}
		// --- END OF MODIFICATIONS: Token Approval Logic ---

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

	// --- START OF MODIFICATIONS: Button Disabled Logic (includes approval states and network status) ---
	const isButtonDisabled = loading || isWritePending || isConfirming || txStatus === 'backendProcessing' || !isFormValid ||
							isApprovePending || isApprovalConfirming || isAllowanceLoading || // Disable during approval steps
							!isOnBaseChain || isSwitchingChain || // Disable if not on Base or switching
							(selectedCrypto?.tokenType !== 0 && !isApprovalConfirmed); // If ERC20, must be approved
	// --- END OF MODIFICATIONS: Button Disabled Logic ---

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
							isAllowanceLoading ? "Checking Allowance..." :
							isApprovePending ? "Awaiting Approval Signature..." :
							isApprovalConfirming ? "Approving Token..." :
							(txStatus === 'approvalSuccess' && selectedCrypto?.tokenType !== 0) ? "Approval Confirmed! Click to Pay" : // Specific text for ERC20 after approval
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
				errorMessage={transactionError || approvalError} // Pass approvalError to modal
				backendMessage={backendMessage}
				requestId={requestId}
			/>
		</AuthGuard>
	)
}
