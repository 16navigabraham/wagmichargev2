"use client"
import BackToDashboard from "@/components/BackToDashboard"
import AuthGuard from "@/components/AuthGuard"
export default function InternetPage() {
  return (
       <AuthGuard>
    <div className="container py-10">
       <BackToDashboard /> {/* 👈 Add this at the top */}
      <h1 className="text-3xl font-bold mb-4">Pay Internet Bills</h1>
      <p className="text-muted-foreground mb-8">
        Instantly pay for Spectranet, Smile, Swift, and more using USDT, USDC, or ETH on Base chain.
      </p>
      {/* Integrate your conversion calculator or internet payment form here */}
      <div className="rounded-lg border p-6 bg-background">
        <p>Coming soon: Pay for your internet with crypto.</p>
      </div>
    </div>
       </AuthGuard>
  )
}
