"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react"

const portfolioData = {
  totalValue: 2847.32,
  change24h: 156.78,
  changePercent: 5.83,
  balances: [
    {
      symbol: "BTC",
      name: "Bitcoin",
      balance: 0.0234,
      value: 1234.56,
      change: 2.34,
      color: "from-orange-500 to-yellow-600",
    },
    {
      symbol: "ETH",
      name: "Ethereum",
      balance: 0.8765,
      value: 987.65,
      change: -1.23,
      color: "from-blue-500 to-purple-600",
    },
    { symbol: "BNB", name: "BNB", balance: 12.34, value: 456.78, change: 4.56, color: "from-yellow-500 to-orange-600" },
    {
      symbol: "MATIC",
      name: "Polygon",
      balance: 234.56,
      value: 168.33,
      change: 8.91,
      color: "from-purple-500 to-pink-600",
    },
  ],
}

export function PortfolioOverview() {
  const isPositive = portfolioData.changePercent > 0

  return (
    <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="h-5 w-5 text-blue-600" />
          <span>Portfolio Overview</span>
        </CardTitle>
        <CardDescription>Your cryptocurrency holdings and performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">${portfolioData.totalValue.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
                  ${Math.abs(portfolioData.change24h).toFixed(2)} ({portfolioData.changePercent.toFixed(2)}%)
                </span>
                <span className="text-sm text-muted-foreground">24h</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {portfolioData.balances.map((crypto) => (
              <div
                key={crypto.symbol}
                className="flex items-center justify-between p-3 rounded-lg border-2 hover:border-blue-200 dark:hover:border-blue-800 transition-colors bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-8 w-8 rounded-full bg-gradient-to-r ${crypto.color} flex items-center justify-center shadow-md`}
                  >
                    <span className="text-white font-bold text-xs">{crypto.symbol.slice(0, 2)}</span>
                  </div>
                  <div>
                    <div className="font-medium">{crypto.symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      {crypto.balance} {crypto.symbol}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${crypto.value.toFixed(2)}</div>
                  <Badge variant={crypto.change > 0 ? "default" : "destructive"} className="text-xs">
                    {crypto.change > 0 ? "+" : ""}
                    {crypto.change.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
