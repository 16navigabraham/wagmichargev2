"use client"

import { WalletConnection } from "@/components/dashboard/wallet-connection"
import { useWallets } from "@privy-io/react-auth"

export default function WalletPage() {
  const { wallets, linkWallet, unlinkWallet } = useWallets()
  const connectedWallet = wallets?.[0]

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-4">Wallet</h1>
      <p className="text-muted-foreground mb-8">
        Connect, view, and manage your wallets.
      </p>
      <WalletConnection
        wallets={wallets}
        linkWallet={linkWallet}
        unlinkWallet={unlinkWallet}
        connectedWallet={connectedWallet}
      />
    </div>
  )
}
