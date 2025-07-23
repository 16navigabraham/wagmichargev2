// app/convert/page.tsx
"use client"

import BackToDashboard from "@/components/BackToDashboard"
import AuthGuard from "@/components/AuthGuard"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const partners = [
  {
    name: "Aboki.xyz",
    url: "https://www.aboki.xyz/",
    description: "Trusted P2P platform for crypto onramp and offramp."
  },
  // {
  //   name: "NairaEx",
  //   url: "https://nairaex.com",
  //   description: "Popular Nigerian crypto exchange supporting bank withdrawals."
  // },
  // {
  //   name: "Busha",
  //   url: "https://www.busha.co",
  //   description: "Instant crypto to fiat with wallet services."
  // },
  // {
  //   name: "YellowCard",
  //   url: "https://yellowcard.io",
  //   description: "Global crypto exchange for African markets."
  // },
]

export default function ConvertPage() {
  return (
    <AuthGuard>
      <div className="container py-10 max-w-2xl mx-auto">
        <BackToDashboard />
        <h1 className="text-3xl font-bold mb-4">Convert Crypto</h1>
        <p className="text-muted-foreground mb-8">
          Instantly convert your crypto with our trusted partners. These platforms support P2P onramp and offramp services.
        </p>

        <div className="grid gap-6">
          {partners.map((partner) => (
            <Card key={partner.name}>
              <CardHeader>
                <CardTitle>{partner.name}</CardTitle>
                <CardDescription>{partner.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Visit {partner.name}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AuthGuard>
  )
}

