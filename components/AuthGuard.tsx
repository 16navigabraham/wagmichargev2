"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/") // Redirect to landing page
    }
  }, [ready, authenticated, router])

  if (!ready) return null
  if (!authenticated) return null // Prevent flicker

  return <>{children}</>
}
