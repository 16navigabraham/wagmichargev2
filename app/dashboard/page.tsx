"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/components/dashboard/dashboard";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user has signed up (in a real app, this would be proper authentication)
    const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
    if (!userEmail) {
      router.replace("/landing");
    }
  }, [router]);

  return <Dashboard />;
}