"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import BackToDashboard from '@/components/BackToDashboard'
import AuthGuard from "@/components/AuthGuard"
import useVTpassVerification from '@/hooks/useVTpassVerification'

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

export default function TVPage() {
	const [crypto, setCrypto] = useState("")
	const [provider, setProvider] = useState("")
	const [plan, setPlan] = useState("")
	const [smartCardNumber, setSmartCardNumber] = useState("")
	const [providers, setProviders] = useState<TVProvider[]>([])
	const [plans, setPlans] = useState<TVPlan[]>([])
	const [prices, setPrices] = useState<any>({})
	const [loading, setLoading] = useState(false)
	const [loadingProviders, setLoadingProviders] = useState(true)
	const [loadingPlans, setLoadingPlans] = useState(false)
	const [requestId, setRequestId] = useState("")

	// Use the verification hook
	const {
		verificationState,
		verifyCustomer,
		resetVerification,
		getProviderConfig,
		isValidLength,
		isValidFormat
	} = useVTpassVerification('tv')

	// Auto-verify when smart card number is complete
	useEffect(() => {
		if (!smartCardNumber || !provider) {
			resetVerification()
			return
		}

		const config = getProviderConfig(provider)
		if (!config) return

		// Check if the number is valid length and format
		if (isValidLength(smartCardNumber, config) && isValidFormat(smartCardNumber, config)) {
			// Debounce the verification to avoid too many calls
			const timeoutId = setTimeout(() => {
				verifyCustomer(smartCardNumber, provider)
			}, 500)

			return () => clearTimeout(timeoutId)
		} else {
			// Reset verification if number is incomplete or invalid
			resetVerification()
		}
	}, [smartCardNumber, provider, verifyCustomer, resetVerification, getProviderConfig, isValidLength, isValidFormat])

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
		if (crypto && provider && plan && smartCardNumber && verificationState.isVerified) {
			setRequestId(generateRequestId())
		}
	}, [crypto, provider, plan, smartCardNumber, verificationState.isVerified])

	const handleSmartCardNumberChange = (value: string) => {
		// Only allow digits and limit to reasonable length
		const cleanValue = value.replace(/\D/g, '').slice(0, 12)
		setSmartCardNumber(cleanValue)
	}

	const handleProviderChange = (newProvider: string) => {
		setProvider(newProvider)
		setSmartCardNumber("")
		resetVerification()
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
			customerName: verificationState.customerName,
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

	const providerConfig = getProviderConfig(provider)
	const isValidInput = providerConfig && isValidLength(smartCardNumber, providerConfig) && isValidFormat(smartCardNumber, providerConfig)

	// Check if all required fields are filled to enable payment
	const canPay = crypto && provider && plan && smartCardNumber && verificationState.isVerified && verificationState.customerName && priceNGN && amountNGN && requestId

	const getInputStatus = () => {
		if (!smartCardNumber || !providerConfig) return null
		
		if (verificationState.isVerifying) {
			return { icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "text-blue-500" }
		}
		
		if (verificationState.isVerified) {
			return { icon: <CheckCircle className="h-4 w-4" />, color: "text-green-500" }
		}
		
		if (verificationState.error) {
			return { icon: <XCircle className="h-4 w-4" />, color: "text-red-500" }
		}
		
		return null
	}

	const inputStatus = getInputStatus()

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
								<Select value={provider} onValueChange={handleProviderChange} disabled={loadingProviders}>
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
								<Label htmlFor="smartCardNumber">
									{providerConfig?.displayName || "Smart Card Number / IUC Number"}
									{providerConfig && (
										<span className="text-sm text-muted-foreground ml-2">
											({Array.isArray(providerConfig.numberLength) 
												? `${providerConfig.numberLength.join(' or ')} digits` 
												: `${providerConfig.numberLength} digits`})
										</span>
									)}
								</Label>
								<div className="relative">
									<Input
										id="smartCardNumber"
										type="text"
										placeholder={providerConfig ? 
											`Enter ${providerConfig.displayName.toLowerCase()}` : 
											"Enter smart card number"
										}
										value={smartCardNumber}
										onChange={(e) => handleSmartCardNumberChange(e.target.value)}
										className={`pr-10 ${
											inputStatus?.color === "text-red-500" ? "border-red-500" : 
											inputStatus?.color === "text-green-500" ? "border-green-500" : ""
										}`}
									/>
									{inputStatus && (
										<div className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${inputStatus.color}`}>
											{inputStatus.icon}
										</div>
									)}
								</div>
								
								{/* Show validation hints */}
								{smartCardNumber && providerConfig && !isValidInput && !verificationState.isVerifying && (
									<p className="text-sm text-muted-foreground">
										{Array.isArray(providerConfig.numberLength) 
											? `Enter ${providerConfig.numberLength.join(' or ')} digits` 
											: `Enter ${providerConfig.numberLength} digits`}
									</p>
								)}
								
								{/* Show verification status */}
								{verificationState.isVerifying && (
									<p className="text-sm text-blue-500">Verifying...</p>
								)}
								
								{verificationState.error && (
									<p className="text-sm text-red-500">{verificationState.error}</p>
								)}
							</div>
							
							<div className="space-y-2">
								<Label htmlFor="customerName">Customer Name</Label>
								<Input
									id="customerName"
									type="text"
									placeholder="Will be filled automatically after verification"
									value={verificationState.customerName}
									readOnly={true}
									className="bg-muted"
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
							{canPay ? "Pay Subscription" : "Complete form to continue"}
						</Button>
					</CardContent>
				</Card>
			</div>
		</AuthGuard>
	)
}