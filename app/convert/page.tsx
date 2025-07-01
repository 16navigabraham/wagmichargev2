"use client"

import { ConversionCalculator } from "@/components/convert/conversion-calculator"

export default function ConvertPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-4">Convert Crypto</h1>
      <p className="text-muted-foreground mb-8">
        Instantly convert your crypto to pay for utilities and services.
      </p>
      <ConversionCalculator />
    </div>
  )
}

