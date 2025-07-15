"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import BackToDashboard from '@/components/BackToDashboard'
import AuthGuard from "@/components/AuthGuard"

const CRYPTOS = [
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum" },
  { symbol: "USDT", name: "Tether", coingeckoId: "tether" },
  { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin" },
]

interface TVProvider {
  numberLength: any
  serviceID: string
  name: string
}

interface TVPlan {
  variation_code: string
  name: string
  variation_amount: string
  fixedPrice: string
}

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}

async function fetchPrices() {
  try {
    const ids = CRYPTOS.map(c => c.coingeckoId).join(",")
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`
    )
    if (!res.ok) throw new Error(String(res.status))
    return await res.json()
  } catch {
    return {}
  }
}

async function fetchTVProviders() {
  try {
    const res = await fetch("/api/vtpass/services?identifier=tv-subscription")
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    return data.content || []
  } catch {
    return []
  }
}

async function fetchTVPlans(serviceID: string) {
  try {
    const res = await fetch(`/api/vtpass/service-variations?serviceID=${serviceID}`)
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    return data.content?.variations || []
  } catch {
    return []
  }
}

async function verifyCard(billersCode: string, serviceID: string) {
  const res = await fetch("/api/vtpass/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ billersCode, serviceID }),
  })
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

export default function TVPage() {
  /* ---------- STATE ---------- */
  const [crypto, setCrypto] = useState("")
  const [provider, setProvider] = useState("")
  const [plan, setPlan] = useState("")
  const [smartCardNumber, setSmartCardNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [providers, setProviders] = useState<TVProvider[]>([])
  const [plans, setPlans] = useState<TVPlan[]>([])
  const [prices, setPrices] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [verifyingCard, setVerifyingCard] = useState(false)
  const [verificationError, setVerificationError] = useState("")
  const [requestId, setRequestId] = useState("")

  /* ---------- EFFECTS ---------- */
  useEffect(() => {
    setLoading(true)
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
    if (crypto && provider && plan && smartCardNumber && customerName && !requestId)
      setRequestId(generateRequestId())
  }, [crypto, provider, plan, smartCardNumber, customerName, requestId])

  /* ---------- AUTO-VERIFY ---------- */
  useEffect(() => {
    const cfg = providers.find(p => p.serviceID === provider)
    const len = Array.isArray(cfg?.numberLength) ? cfg.numberLength : [cfg?.numberLength || 10]
    if (!len.includes(smartCardNumber.length) || !provider) return

    const id = setTimeout(async () => {
      setVerifyingCard(true)
      setVerificationError("")
      setCustomerName("")
      try {
        const data = await verifyCard(smartCardNumber, provider)
        setCustomerName(
          data?.content?.Customer_Name ||
          data?.Customer_Name ||
          data?.customer_name ||
          ""
        )
      } catch {
        setVerificationError("Failed to verify card (401 or network error)")
      } finally {
        setVerifyingCard(false)
      }
    }, 400)
    return () => clearTimeout(id)
  }, [smartCardNumber, provider, providers])

  /* ---------- DERIVED ---------- */
  const selectedCrypto = CRYPTOS.find(c => c.symbol === crypto)
  const selectedPlan = plans.find(p => p.variation_code === plan)
  const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
  const amountNGN = selectedPlan ? Number(selectedPlan.variation_amount) : 0
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0
  const canPay =
    crypto &&
    provider &&
    plan &&
    smartCardNumber &&
    customerName &&
    priceNGN &&
    amountNGN &&
    requestId

  /* ---------- RENDER ---------- */
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
            {/* Crypto */}
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

            {/* Provider */}
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

            {/* Plan */}
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

            {/* Smart Card */}
            <div className="space-y-2">
              <Label>Smart Card / IUC Number</Label>
              <Input
                placeholder="Enter card number"
                value={smartCardNumber}
                onChange={e => {
                  setSmartCardNumber(e.target.value.replace(/\D/g, ""))
                  setVerificationError("")
                  setCustomerName("")
                }}
                maxLength={12}
              />
              {verifyingCard && <p className="text-sm text-blue-500">Verifying…</p>}
              {verificationError && <p className="text-sm text-red-500">{verificationError}</p>}
            </div>

            {/* Customer Name */}
            {customerName && (
              <>
                <Label>Customer Name</Label>
                <Input value={customerName} readOnly className="bg-green-50" />
              </>
            )}

            {/* Summary */}
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
              {canPay ? "Pay Subscription" : "Complete form"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}