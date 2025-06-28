"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dashboard } from "@/components/dashboard/dashboard"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user has signed up (in a real app, this would be proper authentication)
    const userEmail = localStorage.getItem("userEmail")
    if (!userEmail) {
      router.push("/landing")
    }
  }, [router])

  return <Dashboard />
}
