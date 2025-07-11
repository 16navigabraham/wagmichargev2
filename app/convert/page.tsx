"use client"

import BackToDashboard from "@/components/BackToDashboard"
// import { ConversionCalculator } from "@/components/convert/conversion-calculator"
import AuthGuard from "@/components/AuthGuard"

export default function ConvertPage() {
  return (
       <AuthGuard>
    <div className="container py-10">
         <BackToDashboard /> {/* 👈 Add this at the top */}
      <h1 className="text-3xl font-bold mb-4">Convert Crypto</h1>
      <p className="text-muted-foreground mb-8">
        Instantly convert your crypto with our trusted partners.
      </p>
      {/* <ConversionCalculator /> */}
    </div>
       </AuthGuard>
  )
}

