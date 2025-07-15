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

const CRYPTOS = [
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum" },
  { symbol: "USDT", name: "Tether", coingeckoId: "tether" },
  { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin" },
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
  variation_amount: string
  fixedPrice: string
}

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}

async function fetchPrices() {
  try {
    const ids = CRYPTOS.map(c => c.coingeckoId).join(",")
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`
    )
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch {
    return {}
  }
}

async function fetchElectricityPlans(serviceID: string) {
  try {
    const res = await fetch(`/api/vtpass/service-variations?serviceID=${serviceID}`)
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    return data.content?.variations || []
  } catch {
    return []
  }
}

async function verifyMeter(billersCode: string, serviceID: string, type?: string) {
  const res = await fetch("/api/vtpass/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ billersCode, serviceID, type }),
  })
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

export default function ElectricityPage() {
  /* ---------- STATE ---------- */
  const [crypto, setCrypto] = useState("")
  const [provider, setProvider] = useState("")
  const [plan, setPlan] = useState("")
  const [amount, setAmount] = useState("")
  const [meterNumber, setMeterNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [plans, setPlans] = useState<ElectricityPlan[]>([])
  const [prices, setPrices] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [verifyingMeter, setVerifyingMeter] = useState(false)
  const [verificationError, setVerificationError] = useState("")
  const [requestId, setRequestId] = useState("")

  /* ---------- EFFECTS ---------- */
  useEffect(() => {
    setLoading(true)
    fetchPrices().then(setPrices).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!provider) return
    setLoadingPlans(true)
    fetchElectricityPlans(provider).then(setPlans).finally(() => setLoadingPlans(false))
  }, [provider])

  useEffect(() => {
    if (crypto || provider || plan || amount || meterNumber || customerName) {
      if (!requestId) setRequestId(generateRequestId())
    }
  }, [crypto, provider, plan, amount, meterNumber, customerName, requestId])

  /* ---------- AUTO-VERIFY ---------- */
  useEffect(() => {
    const expectedLength = plan === "postpaid" ? 10 : 13 // adjust to your plan codes
    if (meterNumber.length !== expectedLength || !provider) return

    const id = setTimeout(async () => {
      setVerifyingMeter(true)
      setVerificationError("")
      setCustomerName("")
      setCustomerAddress("")

      try {
        const data = await verifyMeter(meterNumber, provider, plan)
        setCustomerName(
          data?.content?.Customer_Name ||
          data?.Customer_Name ||
          data?.customer_name ||
          ""
        )
        setCustomerAddress(
          data?.content?.Address ||
          data?.Address ||
          data?.customer_address ||
          ""
        )
      } catch {
        setVerificationError("Failed to verify meter (401 or network error)")
      } finally {
        setVerifyingMeter(false)
      }
    }, 400)
    return () => clearTimeout(id)
  }, [meterNumber, provider, plan])

  /* ---------- DERIVED ---------- */
  const selectedCrypto = CRYPTOS.find(c => c.symbol === crypto)
  const selectedPlan = plans.find(p => p.variation_code === plan)
  const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
  const amountNGN =
    selectedPlan?.fixedPrice === "Yes"
      ? Number(selectedPlan.variation_amount)
      : Number(amount) || 0
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0
  const selectedProvider = ELECTRICITY_PROVIDERS.find(p => p.serviceID === provider)
  const isFixedPrice = selectedPlan?.fixedPrice === "Yes"
  const canPay =
    crypto &&
    provider &&
    plan &&
    meterNumber &&
    (isFixedPrice || amount) &&
    priceNGN &&
    amountNGN &&
    requestId &&
    customerName

  /* ---------- RENDER ---------- */
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
              <Label>Electricity Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {ELECTRICITY_PROVIDERS.map(p => (
                    <SelectItem key={p.serviceID} value={p.serviceID}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Meter Type */}
            <div className="space-y-2">
              <Label>Meter Type</Label>
              <Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
                <SelectTrigger>
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

            {/* Meter Number */}
            <div className="space-y-2">
              <Label>Meter Number</Label>
              <Input
                type="text"
                placeholder="Enter meter number"
                value={meterNumber}
                onChange={e => {
                  setMeterNumber(e.target.value.replace(/\D/g, ""))
                  setVerificationError("")
                  setCustomerName("")
                  setCustomerAddress("")
                }}
                maxLength={13}
              />
              {verifyingMeter && <p className="text-sm text-blue-500">Verifying…</p>}
              {verificationError && <p className="text-sm text-red-500">{verificationError}</p>}
            </div>

            {/* Customer Info */}
            {customerName && (
              <>
                <Label>Customer Name</Label>
                <Input value={customerName} readOnly className="bg-green-50" />
              </>
            )}
            {customerAddress && (
              <>
                <Label>Address</Label>
                <Input value={customerAddress} readOnly className="bg-green-50" />
              </>
            )}

            {/* Amount (only if not fixed-price) */}
            {!isFixedPrice && (
              <div className="space-y-2">
                <Label>Amount (NGN)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Enter amount in Naira"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
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
                <span>Provider:</span>
                <span>{selectedProvider?.name || "--"}</span>
              </div>
              <div className="flex justify-between">
                <span>Meter Type:</span>
                <span>{selectedPlan?.name || "--"}</span>
              </div>
              <div className="flex justify-between">
                <span>Conversion Rate:</span>
                <span>
                  {selectedCrypto && priceNGN
                    ? `₦${priceNGN.toLocaleString()} / 1 ${selectedCrypto.symbol}`
                    : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Amount to Pay:</span>
                <span>₦{amountNGN.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>You will pay:</span>
                <Badge variant="outline">{cryptoNeeded.toFixed(6)} {crypto}</Badge>
              </div>
            </div>

            <Button className="w-full" disabled={!canPay}>
              {canPay ? "Pay Bill" : "Complete verification"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}