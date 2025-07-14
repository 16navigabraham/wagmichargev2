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

// Static electricity providers (DISCOs) - you can update these based on VTpass supported ones
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

async function fetchElectricityPlans(serviceID: string) {
	try {
		const response = await fetch(`/api/vtpass/service-variations?serviceID=${serviceID}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		})
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}
		
		const data = await response.json()
		return data.content?.variations || []
	} catch (error) {
		console.error('Error fetching electricity plans:', error)
		return []
	}
}

export default function ElectricityPage() {
	const [crypto, setCrypto] = useState("")
	const [provider, setProvider] = useState("")
	const [plan, setPlan] = useState("")
	const [amount, setAmount] = useState("")
	const [meterNumber, setMeterNumber] = useState("")
	const [customerName, setCustomerName] = useState("")
	const [plans, setPlans] = useState<ElectricityPlan[]>([])
	const [prices, setPrices] = useState<any>({})
	const [loading, setLoading] = useState(false)
	const [loadingPlans, setLoadingPlans] = useState(false)
	const [requestId, setRequestId] = useState("")

	useEffect(() => {
		setLoading(true)
		fetchPrices().then((priceData) => {
			setPrices(priceData)
			setLoading(false)
		})
	}, [])

	useEffect(() => {
		if (provider) {
			setLoadingPlans(true)
			fetchElectricityPlans(provider).then((planData) => {
				setPlans(planData)
				setLoadingPlans(false)
				setPlan("")
			})
		}
	}, [provider])

	// Generate requestId when user starts filling form
	useEffect(() => {
		if (crypto || provider || plan || amount || meterNumber || customerName) {
			if (!requestId) {
				setRequestId(generateRequestId())
			}
		}
	}, [crypto, provider, plan, amount, meterNumber, customerName, requestId])

	const selectedCrypto = CRYPTOS.find((c) => c.symbol === crypto)
	const selectedPlan = plans.find((p) => p.variation_code === plan)
	const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
	
	// For electricity, we use custom amount or plan amount
	const amountNGN = selectedPlan?.fixedPrice === "Yes" 
		? Number(selectedPlan.variation_amount) 
		: Number(amount) || 0
	
	const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0

	const selectedProvider = ELECTRICITY_PROVIDERS.find((p) => p.serviceID === provider)
	const isFixedPrice = selectedPlan?.fixedPrice === "Yes"

	const handlePayment = () => {
		// This would be where you send the data to backend
		const orderData = {
			requestId,
			crypto,
			provider,
			plan,
			amount: amountNGN,
			meterNumber,
			customerName,
			cryptoNeeded,
			type: 'electricity'
		}
		console.log('Order data:', orderData)
		// TODO: Send to backend API
	}

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
								<Label htmlFor="provider">Electricity Provider</Label>
								<Select value={provider} onValueChange={setProvider}>
									<SelectTrigger>
										<SelectValue placeholder="Select provider" />
									</SelectTrigger>
									<SelectContent>
										{ELECTRICITY_PROVIDERS.map((p) => (
											<SelectItem key={p.serviceID} value={p.serviceID}>
												{p.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="plan">Meter Type</Label>
								<Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
									<SelectTrigger>
										<SelectValue placeholder={loadingPlans ? "Loading meter types..." : "Select meter type"} />
									</SelectTrigger>
									<SelectContent>
										{plans.map((p) => (
											<SelectItem key={p.variation_code} value={p.variation_code}>
												{p.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="meterNumber">Meter Number</Label>
								<Input
									id="meterNumber"
									type="text"
									placeholder="Enter meter number"
									value={meterNumber}
									onChange={(e) => setMeterNumber(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="customerName">Customer Name</Label>
								<Input
									id="customerName"
									type="text"
									placeholder="Enter customer name"
									value={customerName}
									onChange={(e) => setCustomerName(e.target.value)}
								/>
							</div>
							{!isFixedPrice && (
								<div className="space-y-2">
									<Label htmlFor="amount">Amount (NGN)</Label>
									<Input
										id="amount"
										type="number"
										min={1}
										placeholder="Enter amount in Naira"
										value={amount}
										onChange={(e) => setAmount(e.target.value)}
									/>
								</div>
							)}
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
								<span>Amount to Pay:</span>
								<span>
									{amountNGN ? `₦${amountNGN.toLocaleString()}` : "--"}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span>You will pay:</span>
								<span>
									{crypto && amountNGN && priceNGN ? (
										<Badge variant="outline">
											{cryptoNeeded.toFixed(6)} {crypto}
										</Badge>
									) : (
										"--"
									)}
								</span>
							</div>
						</div>
						<Button className="w-full" disabled onClick={handlePayment}>
							Pay Bill (Coming Soon)
						</Button>
					</CardContent>
				</Card>
			</div>
		</AuthGuard>
	)
}