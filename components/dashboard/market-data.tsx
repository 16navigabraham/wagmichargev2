"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const pairs = [
	{ symbol: "USDT", name: "Tether", id: "tether" },
	{ symbol: "USDC", name: "USD Coin", id: "usd-coin" },
	{ symbol: "ETH", name: "Ethereum", id: "ethereum" },
]

export function MarketData() {
	const [rates, setRates] = useState<any>(null)
	const [loading, setLoading] = useState(false)

	const fetchRates = async () => {
		setLoading(true)
		try {
			const ids = pairs.map((p) => p.id).join(",")
			const res = await fetch(
				`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn,usd`
			)
			const data = await res.json()
			setRates(data)
		} catch {
			setRates(null)
		}
		setLoading(false)
	}

	useEffect(() => {
		fetchRates()
	}, [])

	return (
		<Card className="shadow-lg border-2 hover:shadow-xl transition-shadow">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>NGN ↔ Crypto Conversion</CardTitle>
						<CardDescription>
							Live rates for Naira to USDT, USDC, ETH
						</CardDescription>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={fetchRates}
						disabled={loading}
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						{loading ? "Refreshing..." : "Refresh"}
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{pairs.map((pair) => {
						const rate = rates?.[pair.id]
						return (
							<div
								key={pair.symbol}
								className="flex flex-col items-center justify-between p-3 rounded-lg border-2 hover:border-blue-200 dark:hover:border-blue-800 transition-colors bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
							>
								<div className="font-medium text-lg">{pair.symbol}</div>
								<div className="text-sm text-muted-foreground mb-2">
									{pair.name}
								</div>
								<div className="text-center">
									<div>
										<span className="font-bold">₦</span>{" "}
										<span className="text-xl font-bold">
											{rate ? rate.ngn.toLocaleString() : "--"}
										</span>
									</div>
									<div className="text-xs text-muted-foreground">
										1 {pair.symbol} = ₦
										{rate ? rate.ngn.toLocaleString() : "--"}
									</div>
									<div className="text-xs text-muted-foreground">
										1 {pair.symbol} = ${rate ? rate.usd.toLocaleString() : "--"}
									</div>
								</div>
								<Badge variant="outline" className="mt-2">
									{rate ? "Live" : "Unavailable"}
								</Badge>
							</div>
						)
					})}
				</div>
			</CardContent>
		</Card>
	)
}
