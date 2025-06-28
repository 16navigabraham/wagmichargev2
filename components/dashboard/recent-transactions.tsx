"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, ExternalLink } from "lucide-react"

const transactions = [
  {
    id: "1",
    type: "conversion",
    from: "BTC",
    to: "Airtime",
    amount: "0.001 BTC",
    value: "$42.50",
    status: "completed",
    timestamp: "2 hours ago",
    recipient: "+234 801 234 5678",
  },
  {
    id: "2",
    type: "conversion",
    from: "ETH",
    to: "DSTV",
    amount: "0.05 ETH",
    value: "$89.30",
    status: "pending",
    timestamp: "4 hours ago",
    recipient: "Smart Card: 1234567890",
  },
  {
    id: "3",
    type: "conversion",
    from: "MATIC",
    to: "Electricity",
    amount: "150 MATIC",
    value: "$67.80",
    status: "failed",
    timestamp: "1 day ago",
    recipient: "Meter: 04123456789",
  },
  {
    id: "4",
    type: "conversion",
    from: "BNB",
    to: "Internet",
    amount: "0.2 BNB",
    value: "$45.60",
    status: "completed",
    timestamp: "2 days ago",
    recipient: "Account: user@example.com",
  },
]

const statusConfig = {
  completed: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10", label: "Completed" },
  pending: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Pending" },
  failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Failed" },
}

export function RecentTransactions() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest crypto to utility conversions</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/history">
              View All
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => {
            const status = statusConfig[transaction.status as keyof typeof statusConfig]
            const StatusIcon = status.icon

            return (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <ArrowDownLeft className="h-4 w-4 text-white" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {transaction.from} → {transaction.to}
                    </div>
                    <div className="text-sm text-muted-foreground">{transaction.recipient}</div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{transaction.value}</span>
                    <Badge variant="outline" className={`${status.bg} ${status.color} border-0`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center space-x-1">
                    <span>{transaction.timestamp}</span>
                    <ExternalLink className="h-3 w-3" />
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
