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
import { usePrivy } from "@privy-io/react-auth"
import { useState, useEffect } from "react"

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

// const cryptos = [
//   { name: "Bitcoin", symbol: "BTC", change: "+2.34%", color: "from-orange-500 to-yellow-600" },
//   { name: "Ethereum", symbol: "ETH", change: "-1.23%", color: "from-blue-500 to-purple-600" },
//   { name: "BNB", symbol: "BNB", change: "+4.56%", color: "from-yellow-500 to-orange-600" },
//   { name: "Polygon", symbol: "MATIC", change: "+8.91%", color: "from-purple-500 to-pink-600" },
// ]

const testimonials = [
  {
    name: "From the Team",
    role: "Our Mission",
    content: "WagmiCharge was built to make crypto useful for everyday Africans — starting with airtime.",
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
    content: "We’re just getting started. The earlier you join, the more impact you make.",
    rating: 5,
  },
];

export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { login, signUp } = usePrivy()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModal(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/90 backdrop-blur-sm dark:bg-gray-900/90 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">W</span>
              </div>
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
              <Button variant="outline" onClick={login}>
                Launch App
              </Button>
              {/* <Button variant="default" onClick={signUp}>
                Sign Up
              </Button> */}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge
            className="mb-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg"
            variant="secondary"
          >
            🚀 Now Supporting 4+ Cryptocurrencies
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
            Convert Crypto to
            <br />
            Pay Your Bills
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            The easiest way to use your cryptocurrency for everyday utilities. Pay for airtime, TV subscriptions,
            electricity, and internet bills instantly.
          </p>

          <p className="text-sm text-muted-foreground">Join 10,000+ users already using wagmi charge</p>
        </div>
      </section>


      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need in One Platform</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Convert your cryptocurrency to pay for all your essential services with just a few clicks
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

     {/* Why WagmiCharge Exists Section */}
<section className="py-20 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
  <div className="container mx-auto">
    <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
      Why WagmiCharge Exists
    </h2>
    <div className="grid md:grid-cols-4 gap-8 text-center">
      <div className="group">
        <div className="flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
          <Users className="h-8 w-8 mr-2" />
          <span className="text-3xl font-bold">Built for Everyone</span>
        </div>
        <p className="text-blue-100">
          Anyone can sign up with just an email and get started — no crypto background required.
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
          Your wallet, your data — protected with Privy's encrypted email-based authentication.
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
            onClick={() => window.open("https://docs.google.com/forms/d/e/1FAIpQLSfJwqjdrbTqc6utB9R9ZtRhcpkuBD2AP_S8U_forsFFb1s1Yw/viewform", "_blank")}
            variant="default"
          >
            Join the Waitlist
          </Button>
        </div>
      </section>

       {/* Footer Section */}
      <footer className="bg-white/90 dark:bg-gray-900/90 border-t mt-12 w-full">
  <div className="container mx-auto px-4 py-8 md:py-12">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="md:col-span-1">
        <div className="flex items-center space-x-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Paycrypt
          </span>
        </div>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The easiest way to pay for everyday utilities with cryptocurrency.
        </p>
        <div className="flex space-x-4">
          <a 
            href="https://x.com/yourproject" 
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
            href="https://discord.gg/yourdiscord" 
            target="_blank" 
            rel="noopener noreferrer" 
            aria-label="Discord"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path fill="currentColor" d="M20.317 4.369A19.791 19.791 0 0 0 16.885 3.2a.077.077 0 0 0-.082.038c-.357.63-.755 1.452-1.037 2.104a18.524 18.524 0 0 0-5.532 0 12.683 12.683 0 0 0-1.05-2.104.077.077 0 0 0-.082-.038A19.736 19.736 0 0 0 3.684 4.369a.07.07 0 0 0-.032.027C1.533 7.21.276 10.01.076 12.77a.08.08 0 0 0 .028.063c2.104 1.547 4.144 2.488 6.13 3.104a.077.077 0 0 0 .084-.027c.472-.65.893-1.34 1.25-2.07a.076.076 0 0 0-.041-.104c-.669-.252-1.304-.56-1.92-.927a.077.077 0 0 1-.008-.127c.13-.098.26-.2.384-.304a.075.075 0 0 1 .077-.01c4.03 1.84 8.39 1.84 12.38 0a.075.075 0 0 1 .078.009c.124.104.254.206.384.304a.077.077 0 0 1-.007.127 11.978 11.978 0 0 1-1.921.927.076.076 0 0 0-.04.105c.36.73.782 1.42 1.25 2.07a.077.077 0 0 0 .084.027c1.987-.616 4.027-1.557 6.13-3.104a.08.08 0 0 0 .028-.063c-.2-2.76-1.457-5.56-3.576-8.374a.07.07 0 0 0-.032-.027ZM8.02 14.665c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.174 1.094 2.157 2.418 0 1.334-.955 2.419-2.157 2.419Zm7.96 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.174 1.094 2.157 2.418 0 1.334-.947 2.419-2.157 2.419Z"/>
            </svg>
          </a>
          <a 
            href="https://github.com/yourgithub" 
            target="_blank" 
            rel="noopener noreferrer" 
            aria-label="GitHub"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.254-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.338 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.396.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.847-2.337 4.695-4.566 4.944.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .267.18.579.688.481C19.138 20.2 22 16.448 22 12.021 22 6.484 17.523 2 12 2Z"/>
            </svg>
          </a>
        </div>
      </div>

      {/* Uncomment and adjust these sections if you want to add more footer links */}
      {/* 
      <div>
        <h3 className="font-semibold mb-4 text-foreground">Services</h3>
        <ul className="space-y-2 text-muted-foreground">
          <li className="hover:text-foreground transition-colors cursor-pointer">Airtime Top-up</li>
          <li className="hover:text-foreground transition-colors cursor-pointer">TV Subscriptions</li>
          <li className="hover:text-foreground transition-colors cursor-pointer">Electricity Bills</li>
          <li className="hover:text-foreground transition-colors cursor-pointer">Internet Services</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-4 text-foreground">Support</h3>
        <ul className="space-y-2 text-muted-foreground">
          <li className="hover:text-foreground transition-colors cursor-pointer">Help Center</li>
          <li className="hover:text-foreground transition-colors cursor-pointer">Contact Us</li>
          <li className="hover:text-foreground transition-colors cursor-pointer">API Documentation</li>
          <li className="hover:text-foreground transition-colors cursor-pointer">Status Page</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-4 text-foreground">Legal</h3>
        <ul className="space-y-2 text-muted-foreground">
          <li className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</li>
          <li className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</li>
          <li className="hover:text-foreground transition-colors cursor-pointer">Cookie Policy</li>
          <li className="hover:text-foreground transition-colors cursor-pointer">Compliance</li>
        </ul>
      </div>
      */}
    </div>

    <div className="border-t mt-8 pt-6 text-center text-muted-foreground">
 <p className="text-sm">© {new Date().getFullYear()} Paycrypt. All rights reserved.</p>
 </div>
  </div>
      </footer>
    </div>
  )}