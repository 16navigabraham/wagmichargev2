"use client"

import BackToDashboard from "@/components/BackToDashboard"
import AuthGuard from "@/components/AuthGuard"
export default function ElectricityPage() {
  return (
       <AuthGuard>
    <div className="container py-10">
       <BackToDashboard /> {/* 👈 Add this at the top */}
      <h1 className="text-3xl font-bold mb-4">Pay Electricity Bills</h1>
      <p className="text-muted-foreground mb-8">
        Instantly pay your electricity bills using USDT, USDC, or ETH on Base chain.
      </p>
      {/* Integrate your conversion calculator or electricity payment form here */}
      <div className="rounded-lg border p-6 bg-background">
        <p>Coming soon: Pay for your electricity with crypto.</p>
      </div>
    </div>
       </AuthGuard>
  )
}
