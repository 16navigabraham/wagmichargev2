"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, RefreshCw, Info, Calculator } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Base chain contract addresses
const USDT_CONTRACT = "0xA7D7079b0FEAD91F3e65f86E8915Cb59c1a4C664"
const USDC_CONTRACT = "0xd9AAEC86B65d86F6A7B5b1b0c42FFA531710b6CA"

const cryptos = [
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", contract: null, decimals: 18 },
  { symbol: "USDT", name: "Tether", coingeckoId: "tether", contract: USDT_CONTRACT, decimals: 6 },
  { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", contract: USDC_CONTRACT, decimals: 6 },
]

const utilities = [
  { id: "airtime", name: "Airtime", providers: ["MTN", "Airtel", "Glo", "9mobile"] },
  { id: "tv", name: "TV Subscription", providers: ["DSTV", "GOtv", "Startimes"] },
  { id: "electricity", name: "Electricity", providers: ["EKEDC", "IKEDC", "AEDC"] },
  { id: "internet", name: "Internet", providers: ["Spectranet", "Smile", "Swift"] },
]

async function fetchPrices() {
  const ids = cryptos.map((c) => c.coingeckoId).join(",")
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,ngn`
  )
  return await res.json()
}

async function fetchEthBalance(address: string) {
  const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
  const res = await fetch(
    `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`
  )
  const data = await res.json()
  if (data.status === "1") {
    return Number(data.result) / 1e18
  }
  return 0
}

async function fetchErc20Balance(address: string, contract: string, decimals: number) {
  const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
  const res = await fetch(
    `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=tokenbalance&contractaddress=${contract}&address=${address}&tag=latest&apikey=${apiKey}`
  )
  const data = await res.json()
  if (data.status === "1") {
    return Number(data.result) / 10 ** decimals
  }
  return 0
}

export function ConversionCalculator() {
  const [fromCrypto, setFromCrypto] = useState("")
  const [amount, setAmount] = useState("")
  const [utilityType, setUtilityType] = useState("")
  const [provider, setProvider] = useState("")
  const [recipient, setRecipient] = useState("")
  const [prices, setPrices] = useState<any>({})
  const [balances, setBalances] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [userAddress, setUserAddress] = useState("") // You may want to get this from Privy or wallet context

  // Add a state for utility price
  const [utilityPrice, setUtilityPrice] = useState<number | null>(null)

  // Fetch prices on mount or refresh
  const fetchAllPrices = async () => {
    setLoading(true)
    const priceData = await fetchPrices()
    setPrices(priceData)
    setLoading(false)
  }

  // Fetch balances for the user (replace with actual wallet address)
  const fetchAllBalances = async (address: string) => {
    if (!address) return
    setLoading(true)
    const eth = await fetchEthBalance(address)
    const usdt = await fetchErc20Balance(address, USDT_CONTRACT, 6)
    const usdc = await fetchErc20Balance(address, USDC_CONTRACT, 6)
    setBalances({ ETH: eth, USDT: usdt, USDC: usdc })
    setLoading(false)
  }

  // Fetch utility price when utilityType, provider, or recipient changes
  useEffect(() => {
    async function fetchUtilityPrice() {
      if (!utilityType || !provider || !recipient) {
        setUtilityPrice(null)
        return
      }
      // Replace with your real utility API endpoint and logic
      // Example: fetch price for 1000 NGN airtime
      const res = await fetch(`/api/utility-price?type=${utilityType}&provider=${provider}&recipient=${recipient}`)
      const data = await res.json()
      setUtilityPrice(data.price_ngn)
    }
    fetchUtilityPrice()
  }, [utilityType, provider, recipient])

  useEffect(() => {
    fetchAllPrices()
    // For demo, set a placeholder address or get from wallet context
    // setUserAddress("0xYourWalletAddressHere")
  }, [])

  useEffect(() => {
    if (userAddress) fetchAllBalances(userAddress)
  }, [userAddress])

  const selectedCrypto = cryptos.find((c) => c.symbol === fromCrypto)
  const selectedUtility = utilities.find((u) => u.id === utilityType)
  const cryptoAmount = Number.parseFloat(amount) || 0
  const usdValue = selectedCrypto && prices[selectedCrypto.coingeckoId]
    ? cryptoAmount * prices[selectedCrypto.coingeckoId].usd
    : 0
  const networkFee = 2.5
  const serviceFee = usdValue * 0.015 // 1.5%
  const totalFees = networkFee + serviceFee
  const finalAmount = usdValue - totalFees
  const cryptoPriceNGN = selectedCrypto && prices[selectedCrypto.coingeckoId]?.ngn
  const cryptoNeeded = utilityPrice && cryptoPriceNGN ? (utilityPrice / cryptoPriceNGN) : 0

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Conversion Calculator</span>
          </CardTitle>
          <CardDescription>Calculate crypto to utility conversions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from-crypto">From (Crypto)</Label>
              <Select value={fromCrypto} onValueChange={setFromCrypto}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cryptocurrency" />
                </SelectTrigger>
                <SelectContent>
                  {cryptos.map((crypto) => (
                    <SelectItem key={crypto.symbol} value={crypto.symbol}>
                      <div className="flex items-center space-x-2">
                        <span>{crypto.symbol}</span>
                        <span className="text-muted-foreground">- {crypto.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCrypto && (
                <div className="text-sm text-muted-foreground">
                  Balance: {balances[selectedCrypto.symbol] !== undefined ? balances[selectedCrypto.symbol] : "--"} {selectedCrypto.symbol}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {selectedCrypto && cryptoAmount > 0 && (
                <div className="text-sm text-muted-foreground">
                  ≈ ${usdValue.toFixed(2)} USD
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <ArrowUpDown className="h-4 w-4" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="utility-type">To (Utility)</Label>
              <Select value={utilityType} onValueChange={setUtilityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select utility type" />
                </SelectTrigger>
                <SelectContent>
                  {utilities.map((utility) => (
                    <SelectItem key={utility.id} value={utility.id}>
                      {utility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={setProvider} disabled={!selectedUtility}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {selectedUtility?.providers.map((prov) => (
                    <SelectItem key={prov} value={prov}>
                      {prov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Details</Label>
            <Input
              id="recipient"
              placeholder={
                utilityType === "airtime"
                  ? "Phone number (e.g., +234 801 234 5678)"
                  : utilityType === "tv"
                    ? "Smart card number"
                    : utilityType === "electricity"
                      ? "Meter number"
                      : utilityType === "internet"
                        ? "Account email or username"
                        : "Enter recipient details"
              }
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <Button className="w-full" disabled={!fromCrypto || !utilityType || !provider || !amount || !recipient || loading}>
            Calculate Conversion
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Conversion Summary</span>
            <Button variant="outline" size="sm" onClick={fetchAllPrices} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {loading ? "Refreshing..." : "Refresh Rates"}
            </Button>
          </CardTitle>
          <CardDescription>Review your conversion details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cryptoAmount > 0 && selectedCrypto ? (
            <>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You're converting:</span>
                  <span className="font-medium">
                    {cryptoAmount} {selectedCrypto.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current rate:</span>
                  <span className="font-medium">
                    ${prices[selectedCrypto.coingeckoId]?.usd?.toLocaleString() || "--"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross amount:</span>
                  <span className="font-medium">${usdValue.toFixed(2)}</span>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Network fee:</span>
                    <span>-${networkFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service fee (1.5%):</span>
                    <span>-${serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span>You'll receive:</span>
                    <span className="text-green-600">${finalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {provider && recipient && (
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Provider:</span>
                      <Badge variant="outline">{provider}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recipient:</span>
                      <span className="font-mono text-xs">{recipient}</span>
                    </div>
                  </div>
                )}
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Rates are updated every 30 seconds. Your transaction will be processed at the current market rate.
                </AlertDescription>
              </Alert>

              <Button className="w-full" size="lg">
                Proceed to Payment
              </Button>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter conversion details to see the summary</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
