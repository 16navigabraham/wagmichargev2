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
        {/* Header Section */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {authenticated && connectedWallet
              ? `Wallet: ${connectedWallet.address}`
              : "Connect your wallet to get started."}
          </p>
        </div>
        

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Left Column - Portfolio Overview (Takes 3/4 width on xl screens) */}
          <div className="xl:col-span-3 space-y-8">
            {/* Portfolio Overview Card */}
            <div className="bg-lightblue rounded-xl shadow-sm border border-lightblue-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Portfolio Overview
                </h2>
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
              <PortfolioOverview wallet={connectedWallet} />
            </div>

            {/* Recent Transactions Card */}
            <div className="bg-lightblue rounded-xl shadow-sm border border-lightblue-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Recent Transactions
                </h2>
              </div>
              <RecentTransactions wallet={connectedWallet} />
            </div>

            {/* Market Data Card */}
            <div className="bg-lightblue rounded-xl shadow-sm border border-lightblue-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Market Data
                </h2>
                <div className="text-sm text-gray-500">
                  Real-time data
                </div>
              </div>
              <MarketData />
            </div>
          </div>

          {/* Right Sidebar - Quick Actions */}
          <div className="xl:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Quick Actions Card */}
            <div className="bg-lightblue rounded-xl shadow-sm border border-lightblue-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Quick Actions
                  </h2>
                </div>
                <QuickActions wallet={connectedWallet} />
              </div>


            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}