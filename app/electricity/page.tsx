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

interface ElectricityProvider {
	serviceID: string
	name: string
	minimumAmount?: string
	maximumAmount?: string
	convinience_fee?: string
}

interface ElectricityPlan {
	variation_code: string
	name: string
	variation_amount: string
	fixedPrice: string
}

// Move API keys to server-side only - don't expose in client
async function fetchPrices() {
	const ids = CRYPTOS.map((c) => c.coingeckoId).join(",")
	const res = await fetch(
		`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`
	)
	return await res.json()
}

async function fetchElectricityProviders() {
	try {
		const response = await fetch('/api/vtpass/services?identifier=electricity', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		})
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}
		
		const data = await response.json()
		return data.content || []
	} catch (error) {
		console.error('Error fetching electricity providers:', error)
		return []
	}
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
	const [providers, setProviders] = useState<ElectricityProvider[]>([])
	const [plans, setPlans] = useState<ElectricityPlan[]>([])
	const [prices, setPrices] = useState<any>({})
	const [loading, setLoading] = useState(false)
	const [loadingProviders, setLoadingProviders] = useState(true)
	const [loadingPlans, setLoadingPlans] = useState(false)

	useEffect(() => {
		setLoading(true)
		Promise.all([fetchPrices(), fetchElectricityProviders()]).then(([priceData, providerData]) => {
			setPrices(priceData)
			setProviders(providerData)
			setLoading(false)
			setLoadingProviders(false)
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

	const selectedCrypto = CRYPTOS.find((c) => c.symbol === crypto)
	const selectedPlan = plans.find((p) => p.variation_code === plan)
	const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
	
	// For electricity, we use custom amount or plan amount
	const amountNGN = selectedPlan?.fixedPrice === "Yes" 
		? Number(selectedPlan.variation_amount) 
		: Number(amount) || 0
	
	const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0

	const selectedProvider = providers.find((p) => p.serviceID === provider)
	const isFixedPrice = selectedPlan?.fixedPrice === "Yes"

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
								<Select value={provider} onValueChange={setProvider} disabled={loadingProviders}>
									<SelectTrigger>
										<SelectValue placeholder={loadingProviders ? "Loading providers..." : "Select provider"} />
									</SelectTrigger>
									<SelectContent>
										{providers.map((p) => (
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
										min={selectedProvider?.minimumAmount || 1}
										max={selectedProvider?.maximumAmount}
										placeholder="Enter amount in Naira"
										value={amount}
										onChange={(e) => setAmount(e.target.value)}
									/>
									{selectedProvider?.minimumAmount && selectedProvider?.maximumAmount && (
										<p className="text-sm text-muted-foreground">
											Min: ₦{Number(selectedProvider.minimumAmount).toLocaleString()} - 
											Max: ₦{Number(selectedProvider.maximumAmount).toLocaleString()}
										</p>
									)}
								</div>
							)}
						</div>
						<div className="border-t pt-4 space-y-2">
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
						<Button className="w-full" disabled>
							Pay Bill (Coming Soon)
						</Button>
					</CardContent>
				</Card>
			</div>
		</AuthGuard>
	)
}