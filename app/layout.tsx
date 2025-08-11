import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ClientProviders } from "@/components/ClientProviders"
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Crypto to Utilities",
  description: "Convert cryptocurrency to pay for airtime, TV subscriptions, electricity bills, and more",
  generator: 'TEAM MEMEVIBE'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta name="google-site-verification" content="pCijtRPRcIw7lEvQNXnUtUE4WReAEAgiFl2FURDGrz0" />
        <link rel="icon" href="/paycrypt.png" type="image/png" sizes="32x32" />
        <link rel="shortcut icon" href="/paycrypt.png" type="image/png" />
      </head>
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
