"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Smartphone, Tv, Zap, Wifi, Plus } from "lucide-react"

const actions = [
  { name: "Convert Crypto", icon: ArrowUpDown, href: "/convert", color: "from-blue-500 to-purple-600" },
  { name: "Buy Airtime", icon: Smartphone, href: "/airtime", color: "from-green-500 to-emerald-600" },
  { name: "Pay TV Bills", icon: Tv, href: "/tv", color: "from-orange-500 to-red-600" },
  { name: "Electricity", icon: Zap, href: "/electricity", color: "from-yellow-500 to-orange-600" },
  { name: "Internet Bills", icon: Wifi, href: "/internet", color: "from-purple-500 to-pink-600" },
  { name: "More Services", icon: Plus, href: "/services", color: "from-gray-500 to-gray-600" },
]

export function QuickActions() {
  return (
    <Card>
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
              className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-muted/50 bg-transparent"
              asChild
            >
              <a href={action.href}>
                <div className={`h-8 w-8 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center`}>
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
