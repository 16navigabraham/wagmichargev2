"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dashboard } from "@/components/dashboard/dashboard"
import { LandingPage } from "@/components/landing/landing-page"

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
      <div style={{ marginTop: 32, textAlign: "center" }}>
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

function usePrivy(): { ready: any; authenticated: any; login: any } {
  throw new Error("Function not implemented.")
}

