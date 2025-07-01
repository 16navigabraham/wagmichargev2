"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { PortfolioOverview } from "./portfolio-overview"
import { QuickActions } from "./quick-actions"
import { RecentTransactions } from "./recent-transactions"
import { MarketData } from "./market-data"
// import { WalletConnection } from "./wallet-connection"

export function Dashboard() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your crypto portfolio and recent activity.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <PortfolioOverview />
          </div>
          {/* <div>
            <WalletConnection />
          </div> */}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentTransactions />
          </div>
          <div>
            <QuickActions />
          </div>
        </div>

        <MarketData />
      </div>
    </MainLayout>
  )
}
