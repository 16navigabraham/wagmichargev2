"use client"

import BackToDashboard from "@/components/BackToDashboard"
import AuthGuard from "@/components/AuthGuard"

export default function SettingsPage() {
  return (
       <AuthGuard>
    <div className="container py-10">
       <BackToDashboard /> {/* 👈 Add this at the top */}
      <h1 className="text-3xl font-bold mb-4">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your account and application preferences.
      </p>
      {/* Add your settings form or components here */}
      <div className="rounded-lg border p-6 bg-background">
        <p>Coming soon: Update your preferences and notification settings.</p>
      </div>
    </div>
       </AuthGuard>
  )
}
