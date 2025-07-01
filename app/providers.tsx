"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { PrivyProvider } from "@privy-io/react-auth"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </PrivyProvider>
  )
}
