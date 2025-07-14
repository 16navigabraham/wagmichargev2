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

// Static data providers as requested
const DATA_PROVIDERS = [
	{ id: "mtn", name: "MTN" },
	{ id: "glo", name: "GLO" },
	{ id: "airtel", name: "AIRTEL" },
	{ id: "9mobile", name: "9MOBILE" },
]

interface InternetPlan {
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

async function fetchInternetPlans(serviceID: string) {
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
		console.error('Error fetching internet plans:', error)
		return []
	}
}

export default function InternetPage() {
	const [crypto, setCrypto] = useState("")
	const [provider, setProvider] = useState("")
	const [plan, setPlan] = useState("")
	const [customerID, setCustomerID] = useState("")
	const [plans, setPlans] = useState<InternetPlan[]>([])
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
			fetchInternetPlans(provider).then((planData) => {
				setPlans(planData)
				setLoadingPlans(false)
				setPlan("")
			})
		}
	}, [provider])

	// Generate requestId when user starts filling form
	useEffect(() => {
		if (crypto || provider || plan || customerID) {
			if (!requestId) {
				setRequestId(generateRequestId())
			}
		}
	}, [crypto, provider, plan, customerID, requestId])

	const selectedCrypto = CRYPTOS.find((c) => c.symbol === crypto)
	const selectedPlan = plans.find((p) => p.variation_code === plan)
	const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
	const amountNGN = selectedPlan ? Number(selectedPlan.variation_amount) : 0
	const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0

	const handlePurchase = () => {
		// This would be where you send the data to backend
		const orderData = {
			requestId,
			crypto,
			provider,
			plan,
			customerID,
			amount: amountNGN,
			cryptoNeeded,
			type: 'internet'
		}
		console.log('Order data:', orderData)
		// TODO: Send to backend API
	}

	return (
		<AuthGuard>
			<div className="container py-10 max-w-xl mx-auto">
				<BackToDashboard />
				<h1 className="text-3xl font-bold mb-4">Buy Internet Data</h1>
				<p className="text-muted-foreground mb-8">
					Purchase internet data bundles using USDT, USDC, or ETH on Base chain.
				</p>
				<Card>
					<CardHeader>
						<CardTitle>Crypto to Internet Data</CardTitle>
						<CardDescription>
							Preview and calculate your internet data purchase with crypto
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
								<Label htmlFor="provider">Internet Provider</Label>
								<Select value={provider} onValueChange={setProvider}>
									<SelectTrigger>
										<SelectValue placeholder="Select provider" />
									</SelectTrigger>
									<SelectContent>
										{DATA_PROVIDERS.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="plan">Data Plan</Label>
								<Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
									<SelectTrigger>
										<SelectValue placeholder={loadingPlans ? "Loading plans..." : "Select data plan"} />
									</SelectTrigger>
									<SelectContent>
										{plans.map((p) => (
											<SelectItem key={p.variation_code} value={p.variation_code}>
												{p.name} - ₦{Number(p.variation_amount).toLocaleString()}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="customerID">Customer ID / Phone Number</Label>
								<Input
									id="customerID"
									type="text"
									placeholder="Enter customer ID or phone number"
									value={customerID}
									onChange={(e) => setCustomerID(e.target.value)}
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
								<span>Plan Amount:</span>
								<span>
									{selectedPlan ? `₦${Number(selectedPlan.variation_amount).toLocaleString()}` : "--"}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span>You will pay:</span>
								<span>
									{crypto && selectedPlan && priceNGN ? (
										<Badge variant="outline">
											{cryptoNeeded.toFixed(6)} {crypto}
										</Badge>
									) : (
										"--"
									)}
								</span>
							</div>
						</div>
						<Button className="w-full" disabled onClick={handlePurchase}>
							Purchase (Coming Soon)
						</Button>
					</CardContent>
				</Card>
			</div>
		</AuthGuard>
	)
}