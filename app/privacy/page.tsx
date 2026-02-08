// app/privacy/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Shield, Eye, Server, Lock, UserCheck, FileText, Phone } from "lucide-react"
import BackToDashboard from "@/components/BackToDashboard"

export default function PrivacyPage() {
  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <BackToDashboard />
      
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Shield className="h-16 w-16 text-primary mb-4" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-xl text-muted-foreground">
            Last Updated: February 1, 2026
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Your Privacy Matters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="font-semibold">Data Controller</p>
              <p className="text-sm text-muted-foreground">WEB3 LAB CONCEPT</p>
              <p className="text-sm text-muted-foreground">RC: 9189189</p>
              <p className="text-sm text-muted-foreground">Operating Paycrypt</p>
              <p className="text-sm text-muted-foreground">Email: support@paycrypt.org</p>
            </div>
            <p className="text-muted-foreground">
              This Privacy Policy explains how Paycrypt ("we", "us", "our"), operated by WEB3 LAB CONCEPT, handles your information. 
              We are committed to protecting your privacy while providing a seamless decentralized payment experience. 
              By using our service, you consent to the data practices described in this policy.
            </p>

            <Separator />

            <div className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Eye className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">1. No Personal Data Collection</h3>
                </div>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-9">
                  <li>Paycrypt does not collect personal data (name, email, phone, address)</li>
                  <li>We only interact with public blockchain wallet addresses</li>
                  <li>No user accounts or registration required</li>
                  <li>Your identity remains pseudonymous through your wallet address</li>
                </ul>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">2. Wallet Information Usage</h3>
                </div>
                <p className="text-muted-foreground ml-9">
                  Wallet addresses are used exclusively to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-9">
                  <li>Initiate and process blockchain transactions</li>
                  <li>Validate token balances and contract approvals</li>
                  <li>Display transaction history and order status</li>
                  <li>Prevent duplicate orders and manage refunds</li>
                </ul>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Server className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">3. Third-Party Service Providers</h3>
                </div>
                <p className="text-muted-foreground ml-9">
                  We integrate with authorized third-party service providers to deliver our services:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-9">
                  <li><strong>Blockchain Networks:</strong> Public blockchain networks for transaction processing and validation</li>
                  <li><strong>Market Data Providers:</strong> External APIs for real-time cryptocurrency pricing and market data</li>
                  <li><strong>Utility Service Partners:</strong> Licensed third-party providers for electricity, TV, internet, and airtime services</li>
                  <li><strong>Wallet Infrastructure:</strong> Third-party wallet connection and authentication services</li>
                </ul>
                <p className="text-sm text-muted-foreground ml-9 bg-muted/50 p-3 rounded-lg">
                  <strong>Important:</strong> Third-party services may access blockchain wallet metadata but not personal identity data. 
                  Each service operates under its own privacy policy and terms. We are not responsible for their data practices 
                  or service availability. Service providers may be changed or updated without notice.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">4. Transaction Data</h3>
                </div>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-9">
                  <li>All transactions are recorded on the  blockchain (publicly viewable)</li>
                  <li>Order details are stored temporarily for processing and support purposes</li>
                  <li>Transaction hashes provide permanent, immutable proof of payment</li>
                  <li>Failed transaction data is retained for refund processing</li>
                </ul>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Eye className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">5. Cookies & Website Analytics</h3>
                </div>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-9">
                  <li>We use essential cookies for website functionality and user experience</li>
                  <li>Session storage for maintaining wallet connection state</li>
                  <li>No cross-site tracking or behavioral analytics</li>
                  <li>No advertising cookies or third-party marketing trackers</li>
                </ul>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Lock className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">6. Security Measures</h3>
                </div>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-9">
                  <li>All data transmission occurs over secure HTTPS connections</li>
                  <li>Smart contracts are designed with security best practices and auditing</li>
                  <li>Private keys never touch our servers - they remain in your wallet</li>
                  <li>No sensitive user data is stored on our servers</li>
                </ul>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">7. Your Privacy Rights</h3>
                </div>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-9">
                  <li>Disconnect your wallet at any time to stop using the service</li>
                  <li>No off-chain personal data is stored or linked to your identity</li>
                  <li>Blockchain transactions remain permanently on public ledger</li>
                  <li>Request information about your transaction history via support</li>
                </ul>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">8. Data Retention</h3>
                </div>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-9">
                  <li>Blockchain data is permanent and cannot be deleted</li>
                  <li>Order processing data is retained for support and refund purposes</li>
                  <li>Failed transaction data is kept until refund processing is complete</li>
                  <li>Successful transaction records may be retained for audit purposes</li>
                </ul>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">9. International Users</h3>
                </div>
                <p className="text-muted-foreground ml-9">
                  Paycrypt is accessible globally. By using our service, you acknowledge that 
                  your transaction data will be processed on public blockchains and may be 
                  accessed from various jurisdictions.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">10. Policy Updates</h3>
                </div>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-9">
                  <li>This policy may be updated at any time for transparency, security, or regulatory compliance</li>
                  <li>Changes will be published on our platform with version and date information</li>
                  <li>Continued use after updates constitutes acceptance of new terms</li>
                  <li>We are not obligated to provide individual notice of changes</li>
                  <li>It is your responsibility to review this policy periodically</li>
                </ul>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">11. Limitation of Liability</h3>
                </div>
                <div className="bg-destructive/10 border-l-4 border-destructive p-4 ml-9">
                  <p className="text-muted-foreground">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, WEB3 LAB CONCEPT SHALL NOT BE LIABLE FOR ANY DAMAGES ARISING 
                    FROM DATA BREACHES, UNAUTHORIZED ACCESS, SERVICE INTERRUPTIONS, OR ANY OTHER PRIVACY-RELATED 
                    ISSUES. WE MAKE NO GUARANTEES ABOUT THE SECURITY OF DATA TRANSMITTED THROUGH BLOCKCHAIN NETWORKS.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <Lock className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">12. Compliance & Jurisdiction</h3>
                </div>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-9">
                  <li>This policy is governed by applicable data protection laws</li>
                  <li>Users are responsible for complying with their local privacy regulations</li>
                  <li>We reserve the right to restrict access from certain jurisdictions</li>
                  <li>Blockchain data is publicly accessible and cannot be deleted or modified</li>
                </ul>
              </section>
            </div>

            <Separator />

            <div className="bg-primary/5 p-6 rounded-lg">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </h4>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy or how we handle your information, 
                please contact us at:
              </p>
              <div className="mt-3 space-y-1">
                <p className="font-medium">
                  Email: <a href="mailto:support@paycrypt.org" className="text-primary hover:underline">support@paycrypt.org</a>
                </p>
                <p className="text-sm text-muted-foreground">
                  We aim to respond to all privacy inquiries within 48 hours.
                </p>
              </div>
            </div>

            <div className="bg-muted/30 p-6 rounded-lg">
              <p className="font-semibold mb-3">Consent</p>
              <p className="text-sm text-muted-foreground">
                By using Paycrypt, you consent to this Privacy Policy and our Terms & Conditions. 
                If you do not agree with this policy, you must discontinue use of the service immediately.
              </p>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p className="font-semibold">WEB3 LAB CONCEPT (RC: 9189189)</p>
              <p className="text-xs mt-1">Operating Paycrypt</p>
              <p className="mt-2">Last updated: February 1, 2026 • Version 2.0</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}