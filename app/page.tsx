"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LandingPage } from "@/components/landing/landing-page"
import { usePrivy } from "@privy-io/react-auth"

export default function Landing() {
  const { ready, authenticated, login, signup } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/dashboard")
    }
  }, [ready, authenticated, router])

  return (
    <LandingPage
      onSignIn={login}
      onSignUp={signup}
    />
  )
}
