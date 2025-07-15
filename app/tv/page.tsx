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

interface TVProvider {
	serviceID: string
	name: string
	minimumAmount?: string
	maximumAmount?: string
	convinience_fee?: string
}

interface TVPlan {
	variation_code: string
	name: string
	variation_amount: string
	fixedPrice: string
}

// Generate unique requestId
const generateRequestId = () => {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}

async function fetchPrices() {
	const ids = CRYPTOS.map((c) => c.coingeckoId).join(",")
	const res = await fetch(
		`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`
	)
	return await res.json()
}

async function fetchTVProviders() {
	try {
		const response = await fetch('/api/vtpass/services?identifier=tv-subscription', {
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
		console.error('Error fetching TV providers:', error)
		return []
	}
}

async function fetchTVPlans(serviceID: string) {
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
		console.error('Error fetching TV plans:', error)
		return []
	}
}

// FIXED: Updated verify function with correct parameter names
async function verifySmartCard(billersCode: string, serviceID: string) {
	try {
		const response = await fetch('/api/vtpass/verify', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				billersCode,  // Changed from smartcard_number to billersCode
				serviceID,    // Changed from service_id to serviceID
			}),
		})
		
		if (!response.ok) {
			const errorData = await response.json()
			throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`)
		}
		
		const data = await response.json()
		return data
	} catch (error) {
		console.error('Error verifying smart card:', error)
		throw error
	}
}

export default function TVPage() {
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
	const [verifyingSmartCard, setVerifyingSmartCard] = useState(false)
	const [verificationError, setVerificationError] = useState("")
	const [requestId, setRequestId] = useState("")

	useEffect(() => {
		setLoading(true)
		Promise.all([fetchPrices(), fetchTVProviders()]).then(([priceData, providerData]) => {
			setPrices(priceData)
			setProviders(providerData)
			setLoading(false)
			setLoadingProviders(false)
		})
	}, [])

	useEffect(() => {
		if (provider) {
			setLoadingPlans(true)
			fetchTVPlans(provider).then((planData) => {
				setPlans(planData)
				setLoadingPlans(false)
				setPlan("")
			})
		}
	}, [provider])

	// Generate requestId when user attempts to place order
	useEffect(() => {
		if (crypto && provider && plan && smartCardNumber && customerName) {
			setRequestId(generateRequestId())
		}
	}, [crypto, provider, plan, smartCardNumber, customerName])

	// FIXED: Updated verification handler
	const handleVerifySmartCard = async () => {
		if (!smartCardNumber || !provider) {
			setVerificationError("Please enter smart card number and select a provider")
			return
		}

		setVerifyingSmartCard(true)
		setVerificationError("")
		setCustomerName("")
		
		try {
			const result = await verifySmartCard(smartCardNumber, provider)
			console.log('Verification result:', result) // For debugging
			
			// Handle different possible response structures
			if (result?.content?.Customer_Name) {
				setCustomerName(result.content.Customer_Name)
			} else if (result?.Customer_Name) {
				setCustomerName(result.Customer_Name)
			} else if (result?.content?.customer_name) {
				setCustomerName(result.content.customer_name)
			} else if (result?.customer_name) {
				setCustomerName(result.customer_name)
			} else {
				setVerificationError("Smart card verified but no customer name found")
				console.log('Full verification response:', result)
			}
		} catch (error) {
			console.error('Failed to verify smart card:', error)
			setVerificationError("Failed to verify smart card. Please check the number and try again.")
		} finally {
			setVerifyingSmartCard(false)
		}
	}

	const handlePayment = () => {
		// This would be where you send the data to backend
		const orderData = {
			requestId,
			crypto,
			provider,
			plan,
			amount: amountNGN,
			smartCardNumber,
			customerName,
			cryptoNeeded,
			type: 'tv'
		}
		console.log('Order data:', orderData)
		// TODO: Send to backend API
	}

	const selectedCrypto = CRYPTOS.find((c) => c.symbol === crypto)
	const selectedPlan = plans.find((p) => p.variation_code === plan)
	const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
	const amountNGN = selectedPlan ? Number(selectedPlan.variation_amount) : 0
	const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0

	// Check if all required fields are filled to enable payment
	const canPay = crypto && provider && plan && smartCardNumber && customerName && priceNGN && amountNGN && requestId

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
								<Label htmlFor="provider">TV Provider</Label>
								<Select value={provider} onValueChange={setProvider} disabled={loadingProviders}>
									<SelectTrigger>
										<SelectValue placeholder={loadingProviders ? "Loading providers..." : "Select TV provider"} />
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
								<Label htmlFor="plan">Subscription Plan</Label>
								<Select value={plan} onValueChange={setPlan} disabled={!provider || loadingPlans}>
									<SelectTrigger>
										<SelectValue placeholder={loadingPlans ? "Loading plans..." : "Select subscription plan"} />
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
								<Label htmlFor="smartCardNumber">Smart Card Number / IUC Number</Label>
								<div className="flex space-x-2">
									<Input
										id="smartCardNumber"
										type="text"
										placeholder="Enter smart card number"
										value={smartCardNumber}
										onChange={(e) => {
											setSmartCardNumber(e.target.value)
											setVerificationError("")
											setCustomerName("")
										}}
									/>
									<Button
										type="button"
										onClick={handleVerifySmartCard}
										disabled={!smartCardNumber || !provider || verifyingSmartCard}
										variant="outline"
									>
										{verifyingSmartCard ? "Verifying..." : "Verify"}
									</Button>
								</div>
								{verificationError && (
									<p className="text-sm text-red-500">{verificationError}</p>
								)}
							</div>
							<div className="space-y-2">
								<Label htmlFor="customerName">Customer Name</Label>
								<Input
									id="customerName"
									type="text"
									placeholder="Verify smartcard to get customer name"
									value={customerName}
									onChange={(e) => setCustomerName(e.target.value)}
									readOnly={true}
								/>
							</div>
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
								<span>Subscription Amount:</span>
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
							{requestId && (
								<div className="flex justify-between text-sm">
									<span>Request ID:</span>
									<span className="font-mono text-xs">{requestId}</span>
								</div>
							)}
						</div>
						<Button 
							className="w-full" 
							disabled={!canPay}
							onClick={handlePayment}
						>
							{canPay ? "Pay Subscription" : "Pay Subscription (Coming Soon)"}
						</Button>
					</CardContent>
				</Card>
			</div>
		</AuthGuard>
	)
}