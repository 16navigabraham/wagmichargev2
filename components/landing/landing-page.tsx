"use client"

import type React from "react"
import { ArrowRight,Sun, Moon, Shield, Clock, Users, TrendingUp, CheckCircle, Globe, Star, KeyRound, Zap, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MdOutlineSpeed } from "react-icons/md";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { usePrivy } from "@privy-io/react-auth"
import { useState, useEffect } from "react"
import Link from "next/link"

const features = [
  {
    icon: Shield,
    title: "Secure & Safe",
    description: "Bank-level security with end-to-end encryption for all transactions",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Clock,
    title: "24/7 Available",
    description: "Convert and pay anytime, anywhere with our automated system",
    color: "from-indigo-500 to-purple-600",
  },
  {
    icon: MdOutlineSpeed,
    title: "Instant Payments",
    description: "A fast payment platform ensures that users can pay bills, receive confirmations, and complete transactions within seconds.",
    color: "from-indigo-500 to-purple-600",
  },
]

const testimonials = [
  {
    name: "From the Team",
    role: "Our Mission",
    content: "Paycrypt was built to make crypto useful for everyday people — starting with utility payments.",
    rating: 5,
  },
  {
    name: "Looking Ahead",
    role: "Our Vision",
    content: "We're building the future of decentralized payments for real-world use cases — one bill at a time.",
    rating: 5,
  },
  {
    name: "Join the Movement",
    role: "Be an Early Supporter",
    content: "We're just getting started. The earlier you join, the more impact you make.",
    rating: 5,
  },
];

export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { login, signUp } = usePrivy()
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowTermsModal(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleLaunchApp = () => {
    setShowTermsModal(true)
  }

  const handleProceedToApp = () => {
    if (acceptedTerms && acceptedPrivacy) {
      setShowTermsModal(false)
      login() // Proceed with Privy login
    }
  }

  const canProceed = acceptedTerms && acceptedPrivacy

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/90 backdrop-blur-sm dark:bg-gray-900/90 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src="/paycrypt.png" alt="Paycrypt Logo" className="h-8 w-8 rounded-lg object-contain bg-white shadow-lg" />
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Paycrypt
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
              <Button variant="outline" onClick={handleLaunchApp}>
                Launch App
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Terms & Privacy Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Welcome to Paycrypt
            </DialogTitle>
            <DialogDescription>
              Before you get started, please review and accept our terms and privacy policy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Key Points Summary */}
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
                Key Points:
              </h4>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Paycrypt is a non-custodial service - we never hold your funds</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>You maintain full control of your wallet and private keys</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>All transactions are processed on Base blockchain</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>We don't collect personal data - only wallet addresses</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Minimum payment amounts apply per service provider</span>
                </li>
              </ul>
            </div>

            {/* Risk Disclaimer */}
            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <h4 className="font-semibold mb-2 text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Important Risks:
              </h4>
              <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                <li>• Cryptocurrency transactions are irreversible</li>
                <li>• You are responsible for wallet security and transaction verification</li>
                <li>• Token prices may fluctuate during transaction processing</li>
                <li>• Gas fees apply for all blockchain transactions</li>
              </ul>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="terms" 
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                />
                <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  I have read and agree to the{" "}
                  <Link 
                    href="/terms" 
                    target="_blank"
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    Terms & Conditions
                  </Link>
                  . I understand that Paycrypt is non-custodial and I am responsible for my wallet security.
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="privacy" 
                  checked={acceptedPrivacy}
                  onCheckedChange={(checked) => setAcceptedPrivacy(checked as boolean)}
                />
                <label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                  I have read and agree to the{" "}
                  <Link 
                    href="/privacy" 
                    target="_blank"
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    Privacy Policy
                  </Link>
                  . I understand how my data is handled and processed.
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowTermsModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleProceedToApp}
              disabled={!canProceed}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {canProceed ? "Launch Paycrypt" : "Please Accept Terms"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge
            className="mb-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg"
            variant="secondary"
          >
             Only erc20 tokens are supported
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
           Pay Your Bills
            <br />
            With Cryptocurrency
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            The easiest way to use your cryptocurrency for everyday utilities. Pay for airtime, TV subscriptions,
            electricity, and internet bills instantly.
          </p>

          <p className="text-sm text-muted-foreground">Join amazing users already using paycrypt</p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need in One Platform</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Use your cryptocurrency to pay for all your essential services with just a few clicks
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-2 shadow-lg hover:shadow-xl transition-all hover:border-blue-200 dark:hover:border-blue-800 group"
              >
                <CardHeader>
                  <div
                    className={`h-12 w-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Simple, fast, and secure in just 3 steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center group">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Launch App</h3>
              <p className="text-muted-foreground leading-relaxed">
                Click on the launch app to get started.
              </p>
            </div>

            <div className="text-center group">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Choose a Service</h3>
              <p className="text-muted-foreground leading-relaxed">
                Select the utility you want to pay for — airtime, TV subscription, electricity, or internet.
              </p>
            </div>

            <div className="text-center group">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Pay with Crypto</h3>
              <p className="text-muted-foreground leading-relaxed">
                Make a quick and secure payment using your smart wallet. Services are delivered instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4"> Be Part of the Future of Payments</h2>
            <p className="text-xl text-muted-foreground">No users yet — just a big vision and a clear purpose. Join early and shape what's next.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="border-2 shadow-lg hover:shadow-xl transition-all hover:border-blue-200 dark:hover:border-blue-800"
              >
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 leading-relaxed">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

     {/* Why Paycrypt Exists Section */}
<section className="py-20 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
  <div className="container mx-auto">
    <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
      Why Paycrypt Exists
    </h2>
    <div className="grid md:grid-cols-4 gap-8 text-center">
      <div className="group">
        <div className="flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
          <Users className="h-8 w-8 mr-2" />
          <span className="text-3xl font-bold">Built for Everyone</span>
        </div>
        <p className="text-blue-100">
          Anyone can get started with just a wallet.
        </p>
      </div>
      <div className="group">
        <div className="flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
          <Zap className="h-8 w-8 mr-2" />
          <span className="text-3xl font-bold">Fast Payments</span>
        </div>
        <p className="text-blue-100">
          Top up airtime or pay bills using your connected wallet — all in seconds.
        </p>
      </div>
      <div className="group">
        <div className="flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
          <Shield className="h-8 w-8 mr-2" />
          <span className="text-3xl font-bold">Secure Access</span>
        </div>
        <p className="text-blue-100">
          Your wallet, your data — protected with Privy's encrypted authentication.
        </p>
      </div>
      <div className="group">
        <div className="flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
          <KeyRound className="h-8 w-8 mr-2" />
          <span className="text-3xl font-bold">Wallet Friendly</span>
        </div>
        <p className="text-blue-100">
          Connect any external wallet — MetaMask, Coinbase, WalletConnect, and more.
        </p>
      </div>
    </div>
  </div>
</section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Using Your Crypto?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already converting their cryptocurrency to pay for everyday services
          </p>
          <Button
            onClick={() => window.open("https://forms.gle/voDtR5vBsJtisDEL7", "_blank")}
            variant="default"
          >
            Drop your feedback
          </Button>
        </div>
      </section>

       {/* Footer Section */}
      <footer className="bg-white/90 dark:bg-gray-900/90 border-t mt-12 w-full">
  <div className="container mx-auto px-4 py-8 md:py-12">
    <div className="px-3 w-full">
      <div className="md:col-span-1 items-center  grid grid-cols justify-between h-full">
        <div className="flex items-center space-x-2 mb-4">
          <img src="/paycrypt.png" alt="Paycrypt Logo" className="h-8 w-8 rounded-lg object-contain bg-white shadow-lg" />
          <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Paycrypt
          </span>
        </div>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The easiest way to pay for everyday utilities with cryptocurrency.
        </p>
        <div className="flex space-x-4 mt-2">
          <a 
            href="https://x.com/paycrypt_org" 
            target="_blank" 
            rel="noopener noreferrer" 
            aria-label="X (Twitter)"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path fill="currentColor" d="M17.53 6.47a.75.75 0 0 0-1.06 0L12 10.94 7.53 6.47a.75.75 0 1 0-1.06 1.06L10.94 12l-4.47 4.47a.75.75 0 1 0 1.06 1.06L12 13.06l4.47 4.47a.75.75 0 0 0 1.06-1.06L13.06 12l4.47-4.47a.75.75 0 0 0 0-1.06z"/>
            </svg>
          </a>
         <a 
            href="https://t.me/paycrypt_org" 
                   target="_blank" 
                    rel="noopener noreferrer" 
                      aria-label="Telegram"
                className="text-muted-foreground hover:text-foreground transition-colors"
      >
         <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
               <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06-.01.24-.02.38z"/>
         </svg>
          </a>
          <a 
            href="https://github.com/Team-memevibe/Paycrypt" 
            target="_blank" 
            rel="noopener noreferrer" 
            aria-label="GitHub"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.254-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.338 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.396.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.847-2.337 4.695-4.566 4.944.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .267.18.579.688.481C19.138 20.2 22 16.448 22 12.021 22 6.484 17.523 2 12 2Z"/>
            </svg>
          </a>
          <a 
         href="mailto:support@paycrypt.org" 
             target="_blank" 
                rel="noopener noreferrer" 
                         aria-label="Email"
                     className="text-muted-foreground hover:text-foreground transition-colors"
      >
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
    <path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
</a>
        </div>
      </div>
      <div className="hidden md:block" />
      <div className="hidden md:block" />
      <div className="hidden md:block" />
    </div>
    <div className="border-t mt-8 pt-6 text-center text-muted-foreground w-full">
      <p className="text-sm">© {new Date().getFullYear()} Paycrypt. All rights reserved.</p>
    </div>
  </div>
      </footer>
    </div>
  )
}