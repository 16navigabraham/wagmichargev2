// Fixed TV Page - app/tv/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
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

// Smart card number lengths for different providers
const SMART_CARD_LENGTHS = {
  'dstv': [10, 11],
  'gotv': [10, 11],
  'startimes': [10, 11],
  'showmax': [10, 11],
  'multichoice': [10, 11],
  'default': [10, 11, 12]
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
  try {
    const res = await fetch("/api/vtpass/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billersCode, serviceID }),
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    
    return data
  } catch (error) {
    console.error('Verification error:', error)
    throw error
  }
}

function getSmartCardLength(serviceID: string): number[] {
  const lowerServiceID = serviceID.toLowerCase()
  
  if (lowerServiceID.includes('dstv')) return SMART_CARD_LENGTHS.dstv
  if (lowerServiceID.includes('gotv')) return SMART_CARD_LENGTHS.gotv
  if (lowerServiceID.includes('startimes')) return SMART_CARD_LENGTHS.startimes
  if (lowerServiceID.includes('showmax')) return SMART_CARD_LENGTHS.showmax
  if (lowerServiceID.includes('multichoice')) return SMART_CARD_LENGTHS.multichoice
  
  return SMART_CARD_LENGTHS.default
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
  const [verificationSuccess, setVerificationSuccess] = useState(false)
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
    if (!provider || !smartCardNumber) return
    
    const validLengths = getSmartCardLength(provider)
    
    if (!validLengths.includes(smartCardNumber.length)) {
      setVerificationError("")
      setVerificationSuccess(false)
      setCustomerName("")
      return
    }

    const id = setTimeout(async () => {
      setVerifyingCard(true)
      setVerificationError("")
      setVerificationSuccess(false)
      setCustomerName("")
      
      try {
        const data = await verifyCard(smartCardNumber, provider)
        
        if (data.success && data.content) {
          console.log('Verification response data:', data.content) // Debug log
          
          // More comprehensive customer name extraction
          const name = data.content.Customer_Name ||
                      data.content.customer_name ||
                      data.content.customerName ||
                      data.content.name ||
                      data.content.Name ||
                      data.content.customer?.name ||
                      data.content.customer?.Customer_Name ||
                      data.content.content?.Customer_Name ||
                      data.content.content?.customer_name ||
                      ""
          
          console.log('Extracted customer name:', name) // Debug log
          
          if (name && name.trim()) {
            setCustomerName(name.trim())
            setVerificationSuccess(true)
          } else {
            // Instead of throwing error, let's show what we got
            console.log('Available data fields:', Object.keys(data.content))
            throw new Error("Customer name not found. Please check if the card number is correct.")
          }
        } else {
          throw new Error(data.error || "Verification failed")
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        setVerificationError(errorMessage)
        setVerificationSuccess(false)
        console.error('Card verification failed:', errorMessage)
      } finally {
        setVerifyingCard(false)
      }
    }, 1000)
    
    return () => clearTimeout(id)
  }, [smartCardNumber, provider])

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
    verificationSuccess &&
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
                placeholder={provider ? `Enter ${getSmartCardLength(provider).join(' or ')}-digit card number` : "Enter card number"}
                value={smartCardNumber}
                onChange={e => {
                  const value = e.target.value.replace(/\D/g, "")
                  setSmartCardNumber(value)
                  setVerificationError("")
                  setVerificationSuccess(false)
                  setCustomerName("")
                }}
                maxLength={12}
              />
              
              {/* Verification Status */}
              {verifyingCard && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying card number...</span>
                </div>
              )}
              
              {verificationSuccess && customerName && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Card verified successfully</span>
                </div>
              )}
              
              {verificationError && (
                <div className="flex items-center space-x-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{verificationError}</span>
                </div>
              )}
            </div>

            {/* Customer Name */}
            {customerName && (
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input value={customerName} readOnly className="bg-green-50 border-green-200" />
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