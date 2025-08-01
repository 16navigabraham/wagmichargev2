"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import {
  HelpCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react"

export default function SupportPage() {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const connectedWallet = wallets?.[0]

  const openTypeform = () => {
    window.open('https://form.typeform.com/to/VmRP0ZHH', '_blank')
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground">
            Submit a support request and we'll get back to you within 24 hours
          </p>
        </div>

        {/* Connected Wallet Info */}
        {authenticated && connectedWallet && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-green-800">Wallet Connected</p>
                  <code className="text-sm text-green-600">
                    {connectedWallet.address}
                  </code>
                  <p className="text-xs text-green-600 mt-1">
                    Please include this wallet address in your support request
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Not Connected Warning */}
        {!authenticated && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-orange-800">Wallet Not Connected</p>
                  <p className="text-sm text-orange-600">
                    Please include your wallet address in the support form
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Support Form Button */}
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardContent className="pt-6 pb-8">
              <h2 className="text-2xl font-bold mb-4">Submit Support Request</h2>
              <p className="text-muted-foreground mb-6">
                Click the button below to open our support form
              </p>
              <Button size="lg" onClick={openTypeform} className="w-full max-w-sm">
                Open Support Form
                <ExternalLink className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Iframe Embed */}
        <div className="w-full">
          <Card>
            <CardContent className="p-0">
              <iframe
                src="https://form.typeform.com/to/VmRP0ZHH"
                width="100%"
                height="600"
                frameBorder="0"
                style={{ border: 'none' }}
                title="Support Form"
              />
            </CardContent>
          </Card>
        </div>

        {/* Security Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2 text-blue-800">Security Reminder</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Never share your private keys or seed phrases</li>
                  <li>• Only provide transaction IDs and wallet addresses</li>
                  <li>• Our team will never ask for sensitive information</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}