"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { PortfolioOverview } from "./portfolio-overview"
import { QuickActions } from "./quick-actions"
import RecentTransactions from "./recent-transactions"
import { MarketData } from "./market-data"
import { usePrivy, useWallets } from "@privy-io/react-auth"

export function Dashboard() {
  const { ready, authenticated, user } = usePrivy()
  const { wallets } = useWallets()
  const connectedWallet = wallets?.[0] // Assume first wallet is primary

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {authenticated && connectedWallet
              ? `Wallet: ${connectedWallet.address}`
              : "Connect your wallet to get started."}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <PortfolioOverview wallet={connectedWallet} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentTransactions wallet={connectedWallet} />
          </div>
          <div>
            <QuickActions wallet={connectedWallet} />
          </div>
        </div>

        <MarketData />
      </div>
    </MainLayout>
  )
}