"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import BackToDashboard from "@/components/BackToDashboard"
import AuthGuard from "@/components/AuthGuard"

const CRYPTOS = [
  { symbol: "USDT", name: "Tether", coingeckoId: "tether" },
  { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin" },
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum" },
]

interface TVProvider { serviceID: string; name: string }
interface TVPlan { variation_code: string; name: string; variation_amount: string }

const SMART_CARD_LENGTHS: Record<string, number[]> = {
  dstv: [10, 11],
  gotv: [10, 11],
  startimes: [10, 11],
  showmax: [10, 11],
  default: [10, 11, 12],
}

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}

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

async function verifyCard(billersCode: string, serviceID: string) {
  const res = await fetch("/api/vtpass/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ billersCode, serviceID }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data.content || {}
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
  const [requestId, setRequestId] = useState("")

  /* initial load */
  useEffect(() => {
    Promise.all([fetchPrices(), fetchTVProviders()]).then(([p, prov]) => {
      setPrices(p)
      setProviders(prov)
      setLoading(false)
      setLoadingProviders(false)
    })
  }, [])

  /* fetch plans when provider changes */
  useEffect(() => {
    if (!provider) return
    setLoadingPlans(true)
    fetchTVPlans(provider).then(setPlans).finally(() => setLoadingPlans(false))
  }, [provider])

  /* requestId */
  useEffect(() => {
    if (crypto && provider && plan && smartCardNumber && customerName && !requestId)
      setRequestId(generateRequestId())
  }, [crypto, provider, plan, smartCardNumber, customerName, requestId])

  /* auto-verify smart-card */
  useEffect(() => {
    if (!provider || !smartCardNumber) return
    const validLengths = getSmartCardLength(provider)
    if (!validLengths.includes(smartCardNumber.length)) {
      setVerificationError("")
      setVerificationSuccess(false)
      setCustomerName("")
      setCurrentBouquet("")
      setDueDate("")
      setRenewalAmount("")
      return
    }

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

        const name         = String(content?.Customer_Name || content?.customer_name || "").trim()
        const bouquet      = String(content?.Current_Bouquet || content?.current_bouquet || "").trim()
        const due          = String(content?.Due_Date || content?.due_date || "").trim()
        const renewal      = String(content?.Renewal_Amount || content?.renewal_amount || "").trim()

        if (!name) throw new Error("Customer name not returned")
        setCustomerName(name)
        setCurrentBouquet(bouquet)
        setDueDate(due)
        setRenewalAmount(renewal)
        setVerificationSuccess(true)
      } catch (err: any) {
        setVerificationError(err.message || "Verification failed")
      } finally {
        setVerifyingCard(false)
      }
    }, 1000)
    return () => clearTimeout(id)
  }, [smartCardNumber, provider])

  const selectedCrypto = CRYPTOS.find(c => c.symbol === crypto)
  const selectedPlan   = plans.find(p => p.variation_code === plan)
  const priceNGN       = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
  const amountNGN      = selectedPlan ? Number(selectedPlan.variation_amount) : 0
  const cryptoNeeded   = priceNGN && amountNGN ? amountNGN / priceNGN : 0
  const canPay =
    crypto &&
    provider &&
    plan &&
    smartCardNumber &&
    customerName &&
    verificationSuccess &&
    priceNGN &&
    amountNGN &&
    requestId

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
              <Label>Pay With</Label>
              <Select value={crypto} onValueChange={setCrypto}>
                <SelectTrigger>
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
              <Label>TV Provider</Label>
              <Select value={provider} onValueChange={setProvider} disabled={loadingProviders}>
                <SelectTrigger>
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
              <Label>Subscription Plan</Label>
              <Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
                <SelectTrigger>
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

            {/* smart card */}
            <div className="space-y-2">
              <Label>Smart Card / IUC Number</Label>
              <Input
                placeholder={provider ? `Enter ${getSmartCardLength(provider).join(" or ")}-digit card number` : "Enter card number"}
                value={smartCardNumber}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, "")
                  setSmartCardNumber(v)
                  setVerificationError("")
                  setVerificationSuccess(false)
                  setCustomerName("")
                  setCurrentBouquet("")
                  setDueDate("")
                  setRenewalAmount("")
                }}
                maxLength={12}
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
                <Input value={customerName} readOnly className="bg-green-50" />
              </div>
            )}
            {currentBouquet && (
              <div className="space-y-2">
                <Label>Current Bouquet</Label>
                <Input value={currentBouquet} readOnly className="bg-green-50" />
              </div>
            )}
            {dueDate && (
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input value={dueDate} readOnly className="bg-green-50" />
              </div>
            )}
            {renewalAmount && (
              <div className="space-y-2">
                <Label>Renewal Amount</Label>
                <Input value={`₦${Number(renewalAmount).toLocaleString()}`} readOnly className="bg-green-50" />
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

            <Button className="w-full" disabled={!canPay}>
              {canPay ? "Pay Subscription" : "Complete form and verify card"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}