"use client";

import { Dashboard } from "@/components/dashboard/dashboard";
import AuthGuard from "@/components/AuthGuard"
export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}