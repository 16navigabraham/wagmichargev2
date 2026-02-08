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
            Effective Date: February 1, 2026
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to Paycrypt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="font-semibold">WEB3 LAB CONCEPT</p>
              <p className="text-sm text-muted-foreground">RC: 9189189</p>
              <p className="text-sm text-muted-foreground">Operating Paycrypt - A decentralized utility payment solution</p>
            </div>
            <p className="text-muted-foreground">
              Paycrypt is a decentralized crypto payment solution built for transparency, security, and on-chain commerce. 
              By accessing or using Paycrypt, you agree to be legally bound by the following terms and conditions. 
              If you do not agree to these terms, you must immediately cease using the service.
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
                <h3 className="text-xl font-semibold">6. Service Delivery</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Payments are processed on-chain via blockchain smart contracts</li>
                  <li>Service fulfillment (electricity, TV, internet, airtime) is handled by authorized third-party utility providers</li>
                  <li>We reserve the right to change service providers at any time without prior notice</li>
                  <li>Minimum purchase amounts apply as per service provider requirements</li>
                  <li>Service delivery times may vary depending on provider response and network conditions</li>
                  <li>Failed service deliveries will be automatically flagged for refund processing</li>
                  <li>WEB3 LAB CONCEPT is not responsible for third-party service provider failures, delays, or service quality</li>
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
                <h3 className="text-xl font-semibold">10. Limitation of Liability</h3>
                <div className="bg-destructive/10 border-l-4 border-destructive p-4 space-y-3">
                  <p className="font-semibold text-destructive">IMPORTANT LEGAL NOTICE</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>TO THE MAXIMUM EXTENT PERMITTED BY LAW, PAYCRYPT SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES</li>
                    <li>This includes but is not limited to: loss of funds, loss of profits, loss of data, service interruptions, or any other commercial damages</li>
                    <li>Our total liability shall not exceed the amount of fees paid to us (if any) in the 30 days preceding the claim</li>
                    <li>We provide the service "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">11. Risks & Disclaimers</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Use Paycrypt entirely at your own risk. Blockchain transactions are irreversible</li>
                  <li>Paycrypt is not liable for incorrect token transfers, user errors, or wallet compromises</li>
                  <li>We are not responsible for service downtime, smart contract bugs, or third-party service failures</li>
                  <li>Cryptocurrency market volatility may affect token values significantly</li>
                  <li>Regulatory changes may impact service availability without notice</li>
                  <li>Network congestion may delay or prevent transaction processing</li>
                  <li>We do not guarantee uninterrupted, timely, secure, or error-free service</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">12. Indemnification</h3>
                <p className="text-muted-foreground">
                  You agree to indemnify, defend, and hold harmless WEB3 LAB CONCEPT (operating as Paycrypt), its officers, directors, employees, 
                  agents, and affiliates from any claims, liabilities, damages, losses, costs, or expenses (including 
                  reasonable legal fees) arising from:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Your use or misuse of the service</li>
                  <li>Your violation of these terms</li>
                  <li>Your violation of any applicable laws or regulations</li>
                  <li>Your violation of any third-party rights</li>
                  <li>Any unauthorized access to your wallet or private keys</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">13. Changes & Termination</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>We reserve the right to modify, suspend, or discontinue any part of the service at any time without liability</li>
                  <li>We may update these terms without prior notice. Changes become effective immediately upon posting</li>
                  <li>Continued use after changes implies acceptance of new terms</li>
                  <li>We may terminate or suspend your access immediately for any reason, including breach of terms</li>
                  <li>Users may stop using the service at any time without notice</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">14. Governing Law & Jurisdiction</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>These terms shall be governed by and construed in accordance with applicable laws</li>
                  <li>Any disputes arising from these terms or use of the service shall be subject to the exclusive jurisdiction of competent courts</li>
                  <li>You agree to submit to the personal jurisdiction of such courts</li>
                  <li>Where arbitration is required, it shall be conducted in accordance with recognized arbitration rules</li>
                  <li>The prevailing party in any legal action shall be entitled to recover reasonable attorney fees and costs</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">15. Force Majeure</h3>
                <p className="text-muted-foreground">
                  WEB3 LAB CONCEPT shall not be liable for any failure or delay in performance due to circumstances beyond 
                  our reasonable control, including but not limited to acts of God, war, terrorism, riots, embargoes, 
                  acts of civil or military authorities, fire, floods, accidents, network infrastructure failures, 
                  strikes, or shortages of transportation facilities, fuel, energy, labor, or materials.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">16. Severability</h3>
                <p className="text-muted-foreground">
                  If any provision of these terms is found to be invalid, illegal, or unenforceable, the remaining 
                  provisions shall continue in full force and effect. The invalid provision shall be modified to the 
                  minimum extent necessary to make it valid and enforceable.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">17. Entire Agreement</h3>
                <p className="text-muted-foreground">
                  These terms, together with our Privacy Policy, constitute the entire agreement between you and 
                  WEB3 LAB CONCEPT regarding the use of the service and supersede all prior agreements, understandings, 
                  and communications, whether written or oral.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">18. No Waiver</h3>
                <p className="text-muted-foreground">
                  No waiver of any term or condition of these terms shall be deemed a further or continuing waiver 
                  of such term or any other term. Our failure to assert any right or provision under these terms 
                  shall not constitute a waiver of such right or provision.
                </p>
              </section>
            </div>

            <Separator />

            <div className="bg-muted/30 p-6 rounded-lg space-y-3">
              <p className="font-semibold">Acknowledgment</p>
              <p className="text-sm text-muted-foreground">
                BY ACCESSING OR USING PAYCRYPT, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE 
                TO BE BOUND BY THESE TERMS AND CONDITIONS. YOU ALSO ACKNOWLEDGE THAT YOU UNDERSTAND THE RISKS 
                ASSOCIATED WITH CRYPTOCURRENCY TRANSACTIONS AND BLOCKCHAIN TECHNOLOGY.
              </p>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p className="font-semibold">WEB3 LAB CONCEPT (RC: 9189189)</p>
              <p className="text-xs mt-1">Operating Paycrypt</p>
              <p className="mt-2">Last updated: February 1, 2026</p>
              <p className="mt-2">
                For questions about these terms, contact us at{" "}
                <a href="mailto:support@paycrypt.org" className="text-primary hover:underline">
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