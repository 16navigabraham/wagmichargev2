"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LandingPage } from "@/components/landing/landing-page"
import { usePrivy } from "@privy-io/react-auth"

export default function Landing() {
  const { ready, authenticated, login } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/dashboard")
    }
  }, [ready, authenticated, router])

  return (
    <div>
      <LandingPage />
      <div>
        <button
          onClick={login}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            borderRadius: "6px",
            background: "#111",
            color: "#fff",
            border: "none",
            cursor: "pointer"
          }}
          disabled={!ready || authenticated}
        >
          {authenticated ? "Logged in" : "Login / Sign up"}
        </button>
      </div>
    </div>
  )
}
       