"use client"
import BackToDashboard from "@/components/BackToDashboard"
import AuthGuard from "@/components/AuthGuard"
export default function HistoryPage() {
  return (
       <AuthGuard>
    <div className="container py-10">
       <BackToDashboard /> {/* 👈 Add this at the top */}
      <h1 className="text-3xl font-bold mb-4">Transaction History</h1>
      <p className="text-muted-foreground mb-8">
        View your recent crypto-to-utility transactions.
      </p>
      {/* Integrate your transaction history component here */}
      <div className="rounded-lg border p-6 bg-background">
        <p>Coming soon: See your full transaction history.</p>
      </div>
    </div>
       </AuthGuard>
  )
}
