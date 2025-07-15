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
  default: [10, 11, 12, 13],
}

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}

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

async function verifyMeter(billersCode: string, serviceID: string, type: string) {
  const res = await fetch("/api/vtpass/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ billersCode, serviceID, type }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data.content
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
  const [plan, setPlan] = useState("")
  const [amount, setAmount] = useState("")
  const [meterNumber, setMeterNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [plans, setPlans] = useState<ElectricityPlan[]>([])
  const [prices, setPrices] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [verifyingMeter, setVerifyingMeter] = useState(false)
  const [verificationError, setVerificationError] = useState("")
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const [requestId, setRequestId] = useState("")

  useEffect(() => {
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

  useEffect(() => {
    if (!plan || !meterNumber || !provider) return
    const validLengths = getMeterLength(plan)
    if (!validLengths.includes(meterNumber.length)) {
      setVerificationError("")
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
        const name =
          content.Customer_Name || content.customer_name || content.customer?.customer_name || ""
        const address = content.Address || content.address || content.customer_address || ""

        if (!name) throw new Error("Customer name not returned by VTpass")
        setCustomerName(name)
        setCustomerAddress(address)
        setVerificationSuccess(true)
      } catch (err: any) {
        setVerificationError(err.message || "Verification failed")
      } finally {
        setVerifyingMeter(false)
      }
    }, 1000)
    return () => clearTimeout(id)
  }, [meterNumber, provider, plan])

  const selectedCrypto = CRYPTOS.find(c => c.symbol === crypto)
  const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
  const amountNGN = Number(amount) || 0
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0
  const selectedProvider = ELECTRICITY_PROVIDERS.find(p => p.serviceID === provider)
  const canPay =
    crypto &&
    provider &&
    plan &&
    meterNumber &&
    amount &&
    amountNGN >= 100 &&
    priceNGN &&
    requestId &&
    customerName &&
    verificationSuccess

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

            <div className="space-y-2">
              <Label>Meter Number</Label>
              <Input
                type="text"
                placeholder={plan ? `Enter ${getMeterLength(plan).join(" or ")}-digit meter number` : "Enter meter number"}
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

            {customerName && (
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input value={customerName} readOnly className="bg-green-50" />
              </div>
            )}
            {customerAddress && (
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={customerAddress} readOnly className="bg-green-50" />
              </div>
            )}

            <div className="space-y-2">
              <Label>Amount (NGN)</Label>
              <Input
                type="number"
                min={100}
                max={50000}
                placeholder="Enter amount in Naira"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              <p className="text-sm text-gray-500">Minimum ₦100</p>
            </div>

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
                <span>{plans.find(p => p.variation_code === plan)?.name || "--"}</span>
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
              {canPay ? "Pay Bill" : "Complete form and verify meter"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}