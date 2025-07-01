"use client"

import { PortfolioOverview } from "@/components/dashboard/portfolio-overview"
import { usePrivy, useWallets } from "@privy-io/react-auth"

export default function PortfolioPage() {
  const { wallets } = useWallets()
  const connectedWallet = wallets?.[0]

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-4">Portfolio</h1>
      <p className="text-muted-foreground mb-8">
        View your real-time crypto balances and value on Base chain.
      </p>
      <PortfolioOverview wallet={connectedWallet} />
    </div>
  )
}
