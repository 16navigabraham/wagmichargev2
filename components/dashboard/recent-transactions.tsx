"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, ExternalLink } from "lucide-react"
import { getExplorerConfig } from "@/lib/explorer"

const statusConfig = {
	completed: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10", label: "Completed" },
	pending: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Pending" },
	failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Failed" },
}

async function fetchTransactions(address: string, chain: string) {
	const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
	const chainid = chain === "base" ? 8453 : 1 // default to Ethereum mainnet if not base
	const apiUrl = "https://api.etherscan.io/v2/api"
	const res = await fetch(
		`${apiUrl}?chainid=${chainid}&module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`
	)
	const data = await res.json()
	if (data.status === "1") {
		return data.result.slice(0, 5)
	}
	return []
}

export function RecentTransactions({ wallet }: { wallet: any }) {
	const [transactions, setTransactions] = useState<any[]>([])
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!wallet?.address) return
		setLoading(true)
		fetchTransactions(wallet.address, wallet.chain).then((txs) => {
			setTransactions(txs)
			setLoading(false)
		})
	}, [wallet])

	const explorer = wallet?.chain ? getExplorerConfig(wallet.chain).explorer : "https://etherscan.io"

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Recent Transactions</CardTitle>
						<CardDescription>Your latest wallet activity</CardDescription>
					</div>
					<Button variant="outline" size="sm" asChild>
						<a
							href={`${explorer}/address/${wallet?.address || ""}`}
							target="_blank"
							rel="noopener noreferrer"
						>
							View on Explorer
							<ArrowUpRight className="ml-2 h-4 w-4" />
						</a>
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{loading && <div>Loading...</div>}
					{!loading && transactions.length === 0 && <div>No transactions found.</div>}
					{transactions.map((tx) => {
						const isOutgoing = tx.from?.toLowerCase() === wallet?.address?.toLowerCase()
						const status =
							tx.isError === "0"
								? statusConfig.completed
								: statusConfig.failed
						const StatusIcon = status.icon
						return (
							<div
								key={tx.hash}
								className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
							>
								<div className="flex items-center space-x-3">
									<div className="flex items-center space-x-1">
										<div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
											{isOutgoing ? (
												<ArrowUpRight className="h-4 w-4 text-white" />
											) : (
												<ArrowDownLeft className="h-4 w-4 text-white" />
											)}
										</div>
									</div>
									<div>
										<div className="font-medium">
											{isOutgoing ? "Sent" : "Received"} {Number(tx.value) / 1e18} ETH
										</div>
										<div className="text-sm text-muted-foreground">
											<a
												href={`${explorer}/tx/${tx.hash}`}
												target="_blank"
												rel="noopener noreferrer"
											>
												{tx.hash.slice(0, 10)}...{" "}
												<ExternalLink className="inline h-3 w-3" />
											</a>
										</div>
									</div>
								</div>

								<div className="text-right space-y-1">
									<div className="flex items-center space-x-2">
										<Badge
											variant="outline"
											className={`${status.bg} ${status.color} border-0`}
										>
											<StatusIcon className="h-3 w-3 mr-1" />
											{status.label}
										</Badge>
									</div>
									<div className="text-sm text-muted-foreground flex items-center space-x-1">
										<span>
											{new Date(Number(tx.timeStamp) * 1000).toLocaleString()}
										</span>
									</div>
								</div>
							</div>
						)
					})}
				</div>
			</CardContent>
		</Card>
	)
}
