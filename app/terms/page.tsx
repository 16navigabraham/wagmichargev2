// app/terms/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import BackToDashboard from "@/components/BackToDashboard"

export default function TermsPage() {
  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <BackToDashboard />
      
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Terms & Conditions</h1>
          <p className="text-xl text-muted-foreground">
            Effective Date: July 31, 2025
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to Paycrypt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Paycrypt is a decentralized crypto payment solution built for transparency, security, and on-chain commerce. 
              By accessing or using Paycrypt, you agree to the following terms and conditions.
            </p>

            <Separator />

            <div className="space-y-8">
              <section className="space-y-4">
                <h3 className="text-xl font-semibold">1. Eligibility</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Users must be at least 18 years old</li>
                  <li>You are solely responsible for your wallet security and compliance with local regulations</li>
                  <li>Use of the service must comply with applicable laws in your jurisdiction</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">2. Service Description</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Paycrypt enables ERC20 token-based payments on Base blockchain</li>
                  <li>It is a non-custodial system — Paycrypt never holds user funds</li>
                  <li>All interactions are handled via smart contracts with pre-defined logic</li>
                  <li>Services include electricity bill payments, TV subscriptions, internet data, and airtime purchases</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">3. Wallet Responsibilities</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Users must maintain sufficient ERC20 token balance for transactions</li>
                  <li>Users must approve the Paycrypt smart contract to spend tokens before initiating payments</li>
                  <li>Paycrypt is not responsible for losses due to compromised wallets or private keys</li>
                  <li>Always verify transaction details before confirming</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">4. Token Support</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Only ERC20 tokens in the active token list are supported</li>
                  <li>The team may add, remove, or disable token support at any time for security or compliance reasons</li>
                  <li>Token prices are fetched from external APIs and may fluctuate</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">5. Order Management</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Each order is created on-chain and is immutable once confirmed</li>
                  <li>Orders marked successful send funds to the service provider</li>
                  <li>Orders marked failed are eligible for refund processing</li>
                  <li>Transaction hashes provide permanent proof of payment</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">6. Payment Processing</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Payments are processed through VTPass API for utility services</li>
                  <li>Minimum payment amounts apply as per service provider requirements</li>
                  <li>Processing times may vary depending on service provider response</li>
                  <li>Failed payments will be automatically flagged for refund</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">7. Refund Policy</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Only failed transactions qualify for refunds</li>
                  <li>Refunds are processed and sent back to the originating wallet</li>
                  <li>Successful payments cannot be reversed due to the nature of utility services</li>
                  <li>Refund processing may take 1-7 business days</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">8. Security & Blacklist System</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Wallets may be blacklisted for suspicious or fraudulent activity</li>
                  <li>Admins and contract owners have control over blacklist status</li>
                  <li>Smart contracts include security features to prevent unauthorized access</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">9. Fees & Costs</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Users pay blockchain gas fees for each on-chain transaction</li>
                  <li>No additional platform fees are charged by Paycrypt</li>
                  <li>Service providers may have their own fees included in payment amounts</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">10. Risks & Disclaimers</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Use Paycrypt at your own risk. Blockchain transactions are irreversible</li>
                  <li>Paycrypt is not liable for incorrect token transfers or user errors</li>
                  <li>Service downtime, smart contract upgrades, or third-party service issues</li>
                  <li>Cryptocurrency market volatility affecting token values</li>
                  <li>Regulatory changes that may impact service availability</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">11. Changes & Termination</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>We may update terms or discontinue services with reasonable notice</li>
                  <li>Continued use after changes implies acceptance of new terms</li>
                  <li>Users may stop using the service at any time</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">12. Governing Law</h3>
                <p className="text-muted-foreground">
                  These terms are governed by international cryptocurrency usage standards and 
                  relevant smart contract jurisdiction models. Disputes will be resolved through 
                  arbitration where applicable.
                </p>
              </section>
            </div>

            <Separator />

            <div className="text-center text-sm text-muted-foreground">
              <p>Last updated: July 31, 2025</p>
              <p className="mt-2">
                For questions about these terms, contact us at{" "}
                <a href="mailto:support@paycrypt.xyz" className="text-primary hover:underline">
                  support@paycrypt.org
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}