// app/tv/page.tsx
"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {Button} from "@/components/ui/button"
import {Label} from "@/components/ui/label"
import {Badge} from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import BackToDashboard from "@/components/BackToDashboard"
import AuthGuard from "@/components/AuthGuard"
import { Input } from "@/components/ui/input" // Assuming you have this Input component now

// --- START OF ADDITIONS ---
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { parseEther, parseUnits, toBytes, toHex, Hex } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal"; // Import the modal
// --- END OF ADDITIONS ---

const CRYPTOS = [
  { symbol: "USDT", name: "Tether", coingeckoId: "tether", tokenType: 1, decimals: 6 }, // Added tokenType and decimals
  { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", tokenType: 2, decimals: 6 }, // Added tokenType and decimals
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", tokenType: 0, decimals: 18 }, // Added tokenType and decimals
]

interface TVProvider {
  serviceID: string
  name: string
}
interface TVPlan {
  variation_code: string
  name: string
  variation_amount: string
}

const SMART_CARD_LENGTHS: Record<string, number[]> = {
  dstv: [10, 11],
  gotv: [10, 11],
  startimes: [10, 11],
  showmax: [10, 11], // Assuming showmax might also use a smartcard number
  default: [10, 11, 12],
}

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}

/* ---------- fetch helpers ---------- */
async function fetchPrices() {
  const ids = CRYPTOS.map(c => c.coingeckoId).join(",")
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`)
  return res.ok ? await res.json() : {}
}

async function fetchTVProviders() {
  const res = await fetch("/api/vtpass/services?identifier=tv-subscription")
  const data = res.ok ? await res.json() : {}
  return data.content || []
}

async function fetchTVPlans(serviceID: string) {
  const res = await fetch(`/api/vtpass/service-variations?serviceID=${serviceID}`)
  const data = res.ok ? await res.json() : {}
  return data.content?.variations || []
}

/* ---------- VTpass verify - NOW USES YOUR LOCAL API ROUTE ---------- */
async function verifyCard(billersCode: string, serviceID: string) {
  const res = await fetch("/api/vtpass/verify", { // <--- Changed to your local API route
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ billersCode, serviceID, type: "smartcard" }), // Added type for consistency, though TV might not always need it explicitly depending on VTpass, but good practice.
  })

  const data = await res.json()

  // Your API route structure assumes 'success' and 'data' or 'error'
  if (data.success) {
    return data.data || {};
  } else {
    throw new Error(data.error || "Verification failed");
  }
}

function getSmartCardLength(serviceID: string): number[] {
  const id = serviceID.toLowerCase()
  return SMART_CARD_LENGTHS[id] ?? SMART_CARD_LENGTHS.default
}

export default function TVPage() {
  const [crypto, setCrypto] = useState("")
  const [provider, setProvider] = useState("")
  const [plan, setPlan] = useState("")
  const [smartCardNumber, setSmartCardNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [currentBouquet, setCurrentBouquet] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [renewalAmount, setRenewalAmount] = useState("")
  const [providers, setProviders] = useState<TVProvider[]>([])
  const [plans, setPlans] = useState<TVPlan[]>([])
  const [prices, setPrices] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [verifyingCard, setVerifyingCard] = useState(false)
  const [verificationError, setVerificationError] = useState("")
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const [requestId, setRequestId] = useState<string | undefined>(undefined); // Changed to undefined for initial state

    // --- START OF ADDITIONS: Transaction States ---
    const [txStatus, setTxStatus] = useState<'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' | 'backendProcessing' | 'backendSuccess' | 'backendError'>('idle');
    const [transactionError, setTransactionError] = useState<string | null>(null);
    const [backendMessage, setBackendMessage] = useState<string | null>(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);
    // --- END OF ADDITIONS ---

    const { connectWallet, authenticated, user } = usePrivy();
    const { isConnected, address } = useAccount();

  /* initial load */
  useEffect(() => {
    Promise.all([fetchPrices(), fetchTVProviders()]).then(([p, prov]) => {
      setPrices(p)
      setProviders(prov)
      setLoading(false)
      setLoadingProviders(false)
    })
  }, [])

  useEffect(() => {
    if (!provider) return
    setLoadingPlans(true)
    fetchTVPlans(provider).then(setPlans).finally(() => setLoadingPlans(false))
  }, [provider])

  useEffect(() => {
    // Generate request ID once all necessary data for a payment is present
    if (crypto && provider && plan && smartCardNumber && customerName && verificationSuccess && !requestId)
      setRequestId(generateRequestId())
    else if (! (crypto && provider && plan && smartCardNumber && customerName && verificationSuccess) && requestId) {
      // Clear requestId if conditions are no longer met
      setRequestId(undefined) // Changed to undefined
    }
  }, [crypto, provider, plan, smartCardNumber, customerName, verificationSuccess, requestId])


  /* auto-verify */
  useEffect(() => {
    if (!provider || !smartCardNumber) {
      setCustomerName("")
      setCurrentBouquet("")
      setDueDate("")
      setRenewalAmount("")
      setVerificationError("")
      setVerificationSuccess(false)
      return
    }

    const validLengths = getSmartCardLength(provider)
    if (!validLengths.includes(smartCardNumber.length)) {
      setCustomerName("")
      setCurrentBouquet("")
      setDueDate("")
      setRenewalAmount("")
      setVerificationError(`Please enter a valid ${validLengths.join(" or ")} digit smart card number for ${providers.find(p => p.serviceID === provider)?.name || 'this provider'}.`)
      setVerificationSuccess(false)
      return
    }

    // Debounce the verification request
    const id = setTimeout(async () => {
      setVerifyingCard(true)
      setVerificationError("")
      setVerificationSuccess(false)
      setCustomerName("")
      setCurrentBouquet("")
      setDueDate("")
      setRenewalAmount("")

      try {
        const content = await verifyCard(smartCardNumber, provider)

        const name    = String(content?.Customer_Name || "").trim()
        const bouquet = String(content?.Current_Bouquet || "").trim()
        const due     = String(content?.Due_Date || "").trim()
        const renewal = String(content?.Renewal_Amount || "").trim()

        if (!name) throw new Error("Customer name not found. Please check the smart card number.") // More specific error

        setCustomerName(name)
        setCurrentBouquet(bouquet)
        setDueDate(due)
        setRenewalAmount(renewal)
        setVerificationSuccess(true)
      } catch (err: any) {
        setVerificationError(err.message || "Verification failed. Please try again.")
      } finally {
        setVerifyingCard(false)
      }
    }, 700) // Reduced debounce time slightly for a snappier feel
    return () => clearTimeout(id)
  }, [smartCardNumber, provider, providers]) // Added providers to dependencies for error message

  const selectedCrypto = CRYPTOS.find(c => c.symbol === crypto)
  const selectedPlan   = plans.find(p => p.variation_code === plan)
  const priceNGN       = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
  const amountNGN      = selectedPlan ? Number(selectedPlan.variation_amount) : 0
  const cryptoNeeded   = priceNGN && amountNGN ? amountNGN / priceNGN : 0

    // --- START OF ADDITIONS: Wagmi Hooks ---
    const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
        hash: hash as Hex,
        query: {
            enabled: Boolean(hash),
        },
    });
    // --- END OF ADDITIONS ---

    // --- START OF ADDITIONS: Transaction Status Effect ---
    useEffect(() => {
        if (isWritePending) {
            setTxStatus('waitingForSignature');
            setShowTransactionModal(true);
            setTransactionHashForModal(undefined);
            setTransactionError(null);
            setBackendMessage(null);
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
    // --- END OF ADDITIONS ---

    // --- START OF ADDITIONS: Wallet Connection Helper ---
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
    // --- END OF ADDITIONS ---

    // --- START OF ADDITIONS: handlePurchase and handlePostTransaction ---
    const handlePurchase = async () => {
        setTransactionError(null);
        setBackendMessage(null);
        setTxStatus('waitingForSignature');

        const walletConnected = await ensureWalletConnected();
        if (!walletConnected) {
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
        if (!verificationSuccess || !customerName) {
            toast.error("Please verify smart card number before proceeding with purchase.");
            setTxStatus('error');
            return;
        }
        if (!selectedPlan) {
            toast.error("Please select a subscription plan.");
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
        setTxStatus('backendProcessing');
        setBackendMessage("Processing your order...");
        toast.loading("Processing order with VTpass...", { id: 'backend-status' });

        try {
            const backendResponse = await fetch('/api/tv', { // Assuming /api/tv is your backend endpoint
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId,
                    billersCode: smartCardNumber,
                    serviceID: provider,
                    variation_code: plan, // The selected plan's variation_code
                    amount: amountNGN,
                    // VTpass often uses 'phone' for customer ID in TV, using smartCardNumber here
                    phone: smartCardNumber, 
                    cryptoUsed: cryptoNeeded,
                    cryptoSymbol: selectedCrypto?.symbol,
                    transactionHash
                }),
            });

            if (!backendResponse.ok) {
                const errorData = await backendResponse.json();
                throw new Error(errorData.message || "Failed to subscribe TV via backend.");
            }

            setTxStatus('backendSuccess');
             toast.success("TV subscription paid successfully!", { id: 'backend-status' });
            // Reset form for next transaction
            setCrypto("");
            setProvider("");
            setPlan("");
            setSmartCardNumber("");
            setCustomerName("");
            setCurrentBouquet("");
            setDueDate("");
            setRenewalAmount("");
            setVerificationError("");
            setVerificationSuccess(false);
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
        setTxStatus('idle');
        setTransactionError(null);
        setBackendMessage(null);
        setTransactionHashForModal(undefined);
    };
    // --- END OF ADDITIONS ---

  const canPay =
    crypto &&
    provider &&
    plan &&
    smartCardNumber &&
    customerName && // Ensure customer name is present
    verificationSuccess &&
    priceNGN &&
    amountNGN > 0 && // Ensure amount is greater than 0
    requestId;

    // --- START OF ADDITIONS: Button Disabled Logic ---
    const isButtonDisabled = loading || isWritePending || isConfirming || verifyingCard || txStatus === 'backendProcessing' || !canPay;
    // --- END OF ADDITIONS ---

  if (loading) return <div className="p-10 text-center">Loading…</div>

  return (
    <AuthGuard>
      <div className="container py-10 max-w-xl mx-auto">
        <BackToDashboard />
        <h1 className="text-3xl font-bold mb-4">Pay TV Subscription</h1>
        <p className="text-muted-foreground mb-8">
          Pay for your TV subscription using USDT, USDC, or ETH on Base chain.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Crypto to TV Subscription</CardTitle>
            <CardDescription>
              Preview and calculate your TV subscription payment with crypto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* crypto */}
            <div className="space-y-2">
              <Label htmlFor="crypto-select">Pay With</Label>
              <Select value={crypto} onValueChange={setCrypto}>
                <SelectTrigger id="crypto-select"><SelectValue placeholder="Select crypto" /></SelectTrigger> {/* Moved id here */}
                <SelectContent>
                  {CRYPTOS.map(c => (
                    <SelectItem key={c.symbol} value={c.symbol}>
                      {c.symbol} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* provider */}
            <div className="space-y-2">
              <Label htmlFor="provider-select">TV Provider</Label>
              <Select value={provider} onValueChange={setProvider} disabled={loadingProviders}>
                <SelectTrigger id="provider-select"> {/* Moved id here */}
                  <SelectValue placeholder={loadingProviders ? "Loading..." : "Select provider"} />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(p => (
                    <SelectItem key={p.serviceID} value={p.serviceID}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* plan */}
            <div className="space-y-2">
              <Label htmlFor="plan-select">Subscription Plan</Label>
              <Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
                <SelectTrigger id="plan-select"> {/* Moved id here */}
                  <SelectValue placeholder={loadingPlans ? "Loading..." : "Select plan"} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.variation_code} value={p.variation_code}>
                      {p.name} - ₦{Number(p.variation_amount).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* smart-card */}
            <div className="space-y-2">
              <Label htmlFor="smart-card-input">Smart Card / IUC Number</Label>
              <Input // Using the Input component here
                id="smart-card-input"
                type="text"
                placeholder={provider ? `Enter ${getSmartCardLength(provider).join(" or ")}-digit card number` : "Select a TV Provider first"}
                value={smartCardNumber}
                onChange={(e) => { // Type of event parameter corrected
                  const v = e.target.value.replace(/\D/g, "")
                  setSmartCardNumber(v)
                  // Reset verification states immediately on input change
                  setVerificationError("")
                  setVerificationSuccess(false)
                  setCustomerName("")
                  setCurrentBouquet("")
                  setDueDate("")
                  setRenewalAmount("")
                }}
                maxLength={12} // Max length based on the SMART_CARD_LENGTHS values
                disabled={!provider} // Disable if no provider is selected
              />
              {verifyingCard && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying card…</span>
                </div>
              )}
              {verificationSuccess && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Card verified</span>
                </div>
              )}
              {verificationError && (
                <div className="flex items-center space-x-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{verificationError}</span>
                </div>
              )}
            </div>

          {/* customer details */}
            {customerName && (
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input value={customerName} readOnly className="bg-green-50 text-black" />
              </div>
            )}
            {currentBouquet && (
              <div className="space-y-2">
                <Label>Current Bouquet</Label>
                <Input value={currentBouquet} readOnly className="bg-green-50 text-black" />
              </div>
            )}
            {dueDate && (
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input value={dueDate} readOnly className="bg-green-50 text-black" />
              </div>
            )}
            {renewalAmount && (
              <div className="space-y-2">
                <Label>Renewal Amount</Label>
                <Input value={`₦${Number(renewalAmount).toLocaleString()}`} readOnly className="bg-green-50 text-black" />
              </div>
            )}


            {/* summary */}
            <div className="border-t pt-4 space-y-2 text-sm">
              {requestId && (
                <div className="flex justify-between">
                  <span>Request ID:</span>
                  <span className="font-mono text-xs">{requestId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Conversion Rate:</span>
                <span>
                  {selectedCrypto && priceNGN
                    ? `₦${priceNGN.toLocaleString()} / 1 ${selectedCrypto.symbol}`
                    : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Subscription Amount:</span>
                <span>₦{amountNGN.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>You will pay:</span>
                <Badge variant="outline">{cryptoNeeded.toFixed(6)} {crypto}</Badge>
              </div>
            </div>

            <Button 
                className="w-full" 
                onClick={handlePurchase} // Call handlePurchase
                // disabled={isButtonDisabled} 
            >
                {/* Dynamic button text based on txStatus */}
                {txStatus === 'waitingForSignature' && "Awaiting Signature..."}
                {txStatus === 'sending' && "Sending Transaction..."}
                {txStatus === 'confirming' && "Confirming Blockchain..."}
                {txStatus === 'success' && "Blockchain Confirmed!"}
                {txStatus === 'backendProcessing' && "Processing Order..."}
                {txStatus === 'backendSuccess' && "Payment Successful!"}
                {txStatus === 'backendError' && "Payment Failed - Try Again"}
                {txStatus === 'error' && "Blockchain Failed - Try Again"}
                {txStatus === 'idle' && canPay && "Pay Subscription"}
                {!canPay && "Complete form and verify card"}
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