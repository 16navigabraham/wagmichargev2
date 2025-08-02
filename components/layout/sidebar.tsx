"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Home,
  ArrowUpDown,
  Smartphone,
  Tv,
  Zap,
  Wifi,
  History,
  Settings,
  HelpCircle,
  X,
  TrendingUp,
  Wallet,
} from "lucide-react"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Convert", href: "/convert", icon: ArrowUpDown },
  { name: "Portfolio", href: "/portfolio", icon: TrendingUp },
  { name: "Wallet", href: "/wallet", icon: Wallet },
]

const utilities = [
  { name: "Airtime", href: "/airtime", icon: Smartphone },
  { name: "TV Subscription", href: "/tv", icon: Tv },
  { name: "Electricity", href: "/electricity", icon: Zap },
  { name: "Internet", href: "/internet", icon: Wifi },
]

const other = [
  { name: "Transaction History", href: "/history", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help & Support", href: "/support", icon: HelpCircle },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 transform bg-background border-r transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-4 lg:hidden">
            <span className="font-semibold">Menu</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 px-3">
            <div className="space-y-6 py-4">
              <div>
                <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main</h3>
                <nav className="space-y-1">
                  {navigation.map((item) => (
                    <Button key={item.name} variant="ghost" className="w-full justify-start" asChild>
                      <a href={item.href}>
                        <item.icon className="mr-3 h-4 w-4" />
                        {item.name}
                      </a>
                    </Button>
                  ))}
                </nav>
              </div>

              <div>
                <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Utilities
                </h3>
                <nav className="space-y-1">
                  {utilities.map((item) => (
                    <Button key={item.name} variant="ghost" className="w-full justify-start" asChild>
                      <a href={item.href}>
                        <item.icon className="mr-3 h-4 w-4" />
                        {item.name}
                      </a>
                    </Button>
                  ))}
                </nav>
              </div>

              <div>
                <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Other
                </h3>
                <nav className="space-y-1">
                  {other.map((item) => (
                    <Button key={item.name} variant="ghost" className="w-full justify-start" asChild>
                      <a href={item.href}>
                        <item.icon className="mr-3 h-4 w-4" />
                        {item.name}
                      </a>
                    </Button>
                  ))}
                </nav>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  )
}
