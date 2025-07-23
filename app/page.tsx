"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { LandingPage } from "@/components/landing/landing-page";

export default function HomePage() {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/dashboard");
    }
  }, [ready, authenticated, router]);

  if (!ready) return null;

  return <LandingPage onGetStarted={login} />;
}
