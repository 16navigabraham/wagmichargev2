"use client"

import { useEffect, useState } from "react"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import { getUserHistory } from "@/lib/api"
import { TransactionReceiptModal } from "@/components/TransactionReceiptModal"
import { Button } from "@/components/ui/button"
import * as htmlToImage from "html-to-image"
import download from "downloadjs"
import AuthGuard from "@/components/AuthGuard"

interface Transaction {
  requestId: string
  userAddress: string
  transactionHash: string
  serviceType: string
  serviceID: string
  variationCode?: string
  customerIdentifier: string
  amountNaira: number
  cryptoUsed: number
  cryptoSymbol: string
  onChainStatus: string
  vtpassStatus: string
  vtpassResponse?: any
  createdAt: string
}

export default function HistoryPage() {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const connectedWallet = wallets?.[0]

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetchHistory = async () => {
      if (authenticated && connectedWallet?.address) {
        try {
          setLoading(true)
          const data = await getUserHistory(connectedWallet.address)
          setTransactions(data.orders)
        } catch (err) {
          console.error("Failed to fetch history:", err)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchHistory()
  }, [authenticated, connectedWallet])

  const openModal = (txn: Transaction) => {
    setSelectedOrder(txn)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedOrder(null)
  }

  return (
    <AuthGuard>
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-4">Transaction History</h1>
      <p className="text-muted-foreground mb-6">
        Here are your past transactions. Click on any to view the full receipt.
      </p>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {!loading && transactions.length === 0 && (
        <p className="text-muted-foreground">No transactions found.</p>
      )}

      <div className="space-y-4">
        {transactions.map((txn) => (
          <div
            key={txn.requestId}
            className="border p-4 rounded-md cursor-pointer hover:shadow"
            onClick={() => openModal(txn)}
          >
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {txn.serviceType.toUpperCase()} • ₦{txn.amountNaira} • {txn.cryptoUsed} {txn.cryptoSymbol}
              </span>
              <span
                className={`text-xs ${
                  txn.vtpassStatus === "successful"
                    ? "text-green-600"
                    : txn.vtpassStatus === "pending"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {txn.vtpassStatus}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(txn.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {selectedOrder && (
        <TransactionReceiptModal
          isOpen={isModalOpen}
          onClose={closeModal}
          order={selectedOrder}
        />
      )}
    </div>
     </AuthGuard>
  )
}