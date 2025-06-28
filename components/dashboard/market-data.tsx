"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const marketData = [
  { symbol: "BTC", name: "Bitcoin", price: 52847.32, change: 2.34, volume: "28.5B" },
  { symbol: "ETH", name: "Ethereum", price: 3247.89, change: -1.23, volume: "15.2B" },
  { symbol: "BNB", name: "BNB", price: 387.45, change: 4.56, volume: "2.8B" },
  { symbol: "MATIC", name: "Polygon", price: 0.8234, change: 8.91, volume: "1.2B" },
  { symbol: "ADA", name: "Cardano", price: 0.4567, change: -3.21, volume: "890M" },
  { symbol: "SOL", name: "Solana", price: 98.76, change: 6.78, volume: "1.8B" },
]

export function MarketData() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Market Data</CardTitle>
            <CardDescription>Live cryptocurrency prices and 24h changes</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {marketData.map((crypto) => {
            const isPositive = crypto.change > 0

            return (
              <div key={crypto.symbol} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{crypto.symbol.slice(0, 2)}</span>
                  </div>
                  <div>
                    <div className="font-medium">{crypto.symbol}</div>
                    <div className="text-sm text-muted-foreground">{crypto.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${crypto.price.toLocaleString()}</div>
                  <div className="flex items-center space-x-1">
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
                      {isPositive ? "+" : ""}
                      {crypto.change.toFixed(2)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Vol: {crypto.volume}</div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
