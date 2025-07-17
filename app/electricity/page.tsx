// app/electricity/page.tsx
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
import { Input } from "@/components/ui/input"
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract"; // Import contract config
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

const ELECTRICITY_PROVIDERS = [
  { serviceID: "ikeja-electric", name: "Ikeja Electric" },
  { serviceID: "eko-electric", name: "Eko Electric" },
  { serviceID: "kano-electric", name: "Kano Electric" },
  { serviceID: "portharcourt-electric", name: "Port Harcourt Electric" },
  { serviceID: "jos-electric", name: "Jos Electric" },
  { serviceID: "ibadan-electric", name: "Ibadan Electric" },
  { serviceID: "kaduna-electric", name: "Kaduna Electric" },
  { serviceID: "abuja-electric", name: "Abuja Electric" },
  { serviceID: "enugu-electric", name: "Enugu Electric (EEDC)" },
  { serviceID: "benin-electric", name: "Benin Electric" },
  { serviceID: "aba-electric", name: "Aba Electric" },
  { serviceID: "yola-electric", name: "Yola Electric" },
]

interface ElectricityPlan {
  variation_code: string
  name: string
}

const METER_LENGTHS = {
  prepaid: [11],
  postpaid: [10, 11, 13],
  default: [10, 11, 12, 13], // Added 12 for a more generic default range
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

async function fetchElectricityPlans(serviceID: string) {
  const res = await fetch(`/api/vtpass/service-variations?serviceID=${serviceID}`)
  const data = res.ok ? await res.json() : {}
  return data.content?.variations || []
}

/* ---------- VTpass verify - NOW USES YOUR LOCAL API ROUTE ---------- */
async function verifyMeter(billersCode: string, serviceID: string, type: string) {
  const res = await fetch("/api/vtpass/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ billersCode, serviceID, type }),
  })

  const data = await res.json()

  if (data.success) {
    return data.data || {};
  } else {
    throw new Error(data.error || "Verification failed");
  }
}

function getMeterLength(planCode: string): number[] {
  const lc = planCode.toLowerCase()
  if (lc.includes("prepaid")) return METER_LENGTHS.prepaid
  if (lc.includes("postpaid")) return METER_LENGTHS.postpaid
  return METER_LENGTHS.default
}

export default function ElectricityPage() {
  const [crypto, setCrypto] = useState("")
  const [provider, setProvider] = useState("")
  const [plan, setPlan] = useState("") // This now holds the variation_code for meter type (e.g., "prepaid", "postpaid")
  const [amount, setAmount] = useState("")
  const [meterNumber, setMeterNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [plans, setPlans] = useState<ElectricityPlan[]>([]) // These are the meter types (prepaid/postpaid)
  const [prices, setPrices] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [verifyingMeter, setVerifyingMeter] = useState(false)
  const [verificationError, setVerificationError] = useState("")
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const [requestId, setRequestId] = useState<string | undefined>(undefined);
  
    // FIX: Added phone state declaration
    const [phone, setPhone] = useState(""); 

    // Combined transaction status state
    const [txStatus, setTxStatus] = useState<'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' | 'backendProcessing' | 'backendSuccess' | 'backendError'>('idle');
    const [transactionError, setTransactionError] = useState<string | null>(null);
    const [backendMessage, setBackendMessage] = useState<string | null>(null); // New state for backend message
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);

  const { connectWallet, authenticated, user } = usePrivy();
  const { isConnected, address } = useAccount();

  /* initial load */
  useEffect(() => {
    fetchPrices().then(setPrices).finally(() => setLoading(false))
  }, [])

  /* plans when provider changes */
  useEffect(() => {
    if (!provider) {
        setPlans([]);
        setPlan("");
        return;
    }
    setLoadingPlans(true)
    fetchElectricityPlans(provider).then(setPlans).finally(() => setLoadingPlans(false))
  }, [provider])

  /* requestId generator */
  useEffect(() => {
    // FIX: Added 'phone' to the requestId generation dependencies
    if (crypto && provider && plan && amount && meterNumber && customerName && phone && verificationSuccess && !requestId) { 
      setRequestId(generateRequestId())
    } else if (! (crypto && provider && plan && amount && meterNumber && customerName && phone && verificationSuccess) && requestId) { 
      setRequestId(undefined) // Reset to undefined
    }
  }, [crypto, provider, plan, amount, meterNumber, customerName, phone, verificationSuccess, requestId])

  /* auto-verify meter */
  useEffect(() => {
    if (!plan || !meterNumber || !provider) {
      setVerificationError("")
      setVerificationSuccess(false)
      setCustomerName("")
      setCustomerAddress("")
      return
    }

    const validLengths = getMeterLength(plan)
    if (!validLengths.includes(meterNumber.length)) {
      setVerificationError(`Please enter a valid ${validLengths.join(" or ")} digit meter number for ${plans.find(p => p.variation_code === plan)?.name || 'this meter type'}.`)
      setVerificationSuccess(false)
      setCustomerName("")
     setCustomerAddress("")
      return
    }

    const id = setTimeout(async () => {
      setVerifyingMeter(true)
      setVerificationError("")
      setVerificationSuccess(false)
      setCustomerName("")
      setCustomerAddress("")

      try {
        const content = await verifyMeter(meterNumber, provider, plan)

        const name    = String(content?.Customer_Name || "").trim()
        const address = String(content?.Address || "").trim()

        if (!name) throw new Error("Customer name not found. Please check the meter number.")

        setCustomerName(name)
        setCustomerAddress(address)
        setVerificationSuccess(true)
      } catch (err: any) {
        setVerificationError(err.message || "Verification failed. Please try again.")
      } finally {
        setVerifyingMeter(false)
      }
    }, 700)
    return () => clearTimeout(id)
  }, [meterNumber, provider, plan, plans])

  /* derived values */
  const selectedCrypto = CRYPTOS.find(c => c.symbol === crypto)
  const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
  const amountNGN = Number(amount) || 0
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0

  const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
    hash: hash as Hex,
    query: {
      enabled: Boolean(hash),
    },
  });

  // Handle blockchain transaction status feedback and modal display
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
      const orderData = {
        requestId,
        crypto: selectedCrypto?.symbol,
        provider,
        meter_number: meterNumber,
        serviceID: provider, // Assuming provider ID is serviceID
        variation_code: plan, // Meter type (prepaid/postpaid)
        amount: amountNGN,
        cryptoNeeded,
        type: 'electricity',
        transactionHash,
        userAddress: address,
        phone: phone, // FIX: Use the actual phone state
      };
      console.log('Submitting order to backend:', orderData);
      const backendResponse = await fetch('/api/electricity', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          meter_number: meterNumber,
          serviceID: provider,
          variation_code: plan,
          amount: amountNGN,
          phone: phone, // FIX: Use the actual phone state
          cryptoUsed: cryptoNeeded,
          cryptoSymbol: selectedCrypto?.symbol,
          transactionHash
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        throw new Error(errorData.message || "Failed to deliver electricity via backend.");
      }

      setTxStatus('backendSuccess');
      setBackendMessage("Electricity bill paid successfully!");
      toast.success("Electricity bill paid successfully!", { id: 'backend-status' });
      // Reset form for next transaction
      setCrypto("");
      setProvider("");
      setPlan("");
      setAmount("");
      setMeterNumber("");
      setCustomerName("");
      setCustomerAddress("");
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
    // Reset all transaction states when modal is closed, especially after success or error
    setTxStatus('idle');
    setTransactionError(null);
    setBackendMessage(null);
    setTransactionHashForModal(undefined);
  };

  const canPay =
    crypto &&
    provider &&
    plan &&
    meterNumber &&
    amount &&
    amountNGN >= 100 &&
    phone && // FIX: Added phone to canPay condition
    priceNGN &&
    requestId &&
    customerName &&
    verificationSuccess;

  // FIX: Corrected the disabled prop syntax
  const isButtonDisabled = loading || loadingPlans || verifyingMeter || isWritePending || isConfirming || txStatus === 'backendProcessing' || !canPay;

  if (loading) return <div className="p-10 text-center">Loading…</div>

  return (
    <AuthGuard>
      <div className="container py-10 max-w-xl mx-auto">
        <BackToDashboard />
        <h1 className="text-3xl font-bold mb-4">Pay Electricity Bill</h1>
        <p className="text-muted-foreground mb-8">
          Pay your electricity bills using USDT, USDC, or ETH on Base chain.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Crypto to Electricity Payment</CardTitle>
            <CardDescription>
              Preview and calculate your electricity bill payment with crypto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* crypto */}
            <div className="space-y-2">
              <Label htmlFor="crypto-select">Pay With</Label>
              <Select value={crypto} onValueChange={setCrypto}>
                <SelectTrigger id="crypto-select">
                  <SelectValue placeholder="Select crypto" />
                </SelectTrigger>
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
              <Label htmlFor="provider-select">Electricity Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger id="provider-select">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent> {/* FIX: Added missing closing SelectContent tag */}
                  {ELECTRICITY_PROVIDERS.map(p => (
                    <SelectItem key={p.serviceID} value={p.serviceID}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* meter type */}
            <div className="space-y-2">
              <Label htmlFor="meter-type-select">Meter Type</Label>
              <Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
                <SelectTrigger id="meter-type-select">
                  <SelectValue placeholder={loadingPlans ? "Loading..." : "Select type"} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.variation_code} value={p.variation_code}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* meter number */}
            <div className="space-y-2">
              <Label htmlFor="meter-number-input">Meter Number</Label>
              <Input
                id="meter-number-input"
                type="text"
                placeholder={plan ? `Enter ${getMeterLength(plan).join(" or ")}-digit meter number` : "Select a Meter Type first"}
                value={meterNumber}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, "")
                  setMeterNumber(v)
                  setVerificationError("")
                  setVerificationSuccess(false)
                  setCustomerName("")
                 setCustomerAddress("")
                }}
                maxLength={13}
                disabled={!plan}
              />
              {verifyingMeter && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying meter…</span>
                </div>
              )}
              {verificationSuccess && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Meter verified</span>
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
            {customerAddress && (
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={customerAddress} readOnly className="bg-green-50 text-black" />
              </div>
            )}

            {/* amount */}
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
            {/* Phone Number for Electricity - it's in your code, keeping it */}
            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (for token/receipt)</Label>
                <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. 080*********"
                    maxLength={11}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
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
              disabled={isButtonDisabled} // Re-enabled the disabled prop based on isButtonDisabled
            >
              {txStatus === 'waitingForSignature' && "Awaiting Signature..."}
              {txStatus === 'sending' && "Sending Transaction..."}
              {txStatus === 'confirming' && "Confirming Blockchain..."}
              {txStatus === 'success' && "Blockchain Confirmed!"}
              {txStatus === 'backendProcessing' && "Processing Order..."}
              {txStatus === 'backendSuccess' && "Payment Successful!"}
              {txStatus === 'backendError' && "Payment Failed - Try Again"}
              {txStatus === 'error' && "Blockchain Failed - Try Again"}
              {txStatus === 'idle' && canPay && "Pay Bill"}
              {txStatus === 'idle' && !canPay && "Fill all details"}
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