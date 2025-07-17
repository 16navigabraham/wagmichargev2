"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Smartphone, Tv, Zap, Wifi, Plus } from "lucide-react"

const actions = [
	{ name: "Buy Airtime", icon: Smartphone, href: "/airtime", color: "from-green-500 to-emerald-600" },
	{ name: "Pay Internet Bills", icon: Wifi, href: "/internet", color: "from-purple-500 to-pink-600" },
	{ name: "Pay TV Bills", icon: Tv, href: "/tv", color: "from-orange-500 to-red-600" },
	{ name: "Pay Electricity Bills", icon: Zap, href: "/electricity", color: "from-yellow-500 to-orange-600" },
	{ name: "Convert Crypto", icon: ArrowUpDown, href: "/convert", color: "from-blue-500 to-purple-600" },
	{ name: "More Services", icon: Plus, href: "/services", color: "from-gray-500 to-gray-600" },

	
]

export function QuickActions({ wallet }: { wallet: any }) {
	return (
		<Card className="shadow-lg border-2 hover:shadow-xl transition-shadow">
			<CardHeader>
				<CardTitle>Quick Actions</CardTitle>
				<CardDescription>Common tasks and services</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-3">
					{actions.map((action) => (
						<Button
							key={action.name}
							variant="outline"
							className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900 dark:hover:to-purple-900 bg-transparent border-2 hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
							asChild
						>
							<a href={action.href + (wallet?.address ? `?wallet=${wallet.address}` : "")}>
								<div
									className={`h-8 w-8 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
								>
									<action.icon className="h-4 w-4 text-white" />
								</div>
								<span className="text-xs font-medium text-center">{action.name}</span>
							</a>
						</Button>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
