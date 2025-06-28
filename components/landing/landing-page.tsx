"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Smartphone,
  Tv,
  Zap,
  Wifi,
  Shield,
  Clock,
  TrendingUp,
  CheckCircle,
  Star,
  Users,
  Globe,
} from "lucide-react"
import { useRouter } from "next/navigation"

const features = [
  {
    icon: Smartphone,
    title: "Instant Airtime",
    description: "Convert crypto to airtime for all major Nigerian networks instantly",
  },
  {
    icon: Tv,
    title: "TV Subscriptions",
    description: "Pay for DSTV, GOtv, and Startimes subscriptions with cryptocurrency",
  },
  {
    icon: Zap,
    title: "Electricity Bills",
    description: "Top up your electricity meter using Bitcoin, Ethereum, and more",
  },
  {
    icon: Wifi,
    title: "Internet Services",
    description: "Pay for internet subscriptions from major Nigerian ISPs",
  },
  {
    icon: Shield,
    title: "Secure & Safe",
    description: "Bank-level security with end-to-end encryption for all transactions",
  },
  {
    icon: Clock,
    title: "24/7 Available",
    description: "Convert and pay anytime, anywhere with our automated system",
  },
]

const cryptos = [
  { name: "Bitcoin", symbol: "BTC", change: "+2.34%" },
  { name: "Ethereum", symbol: "ETH", change: "-1.23%" },
  { name: "BNB", symbol: "BNB", change: "+4.56%" },
  { name: "Polygon", symbol: "MATIC", change: "+8.91%" },
]

const testimonials = [
  {
    name: "Adebayo O.",
    role: "Crypto Trader",
    content: "Finally, a way to use my crypto for everyday bills. wagmi charge has made my life so much easier!",
    rating: 5,
  },
  {
    name: "Sarah M.",
    role: "Tech Professional",
    content: "The fastest way to convert crypto to airtime. I've saved so much time and money using this platform.",
    rating: 5,
  },
  {
    name: "Michael K.",
    role: "Student",
    content: "Perfect for paying my electricity bills with the crypto I earn. Simple and reliable.",
    rating: 5,
  },
]

export function LandingPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Store email in localStorage for demo purposes
    localStorage.setItem("userEmail", email)

    // Redirect to main dashboard
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <span className="font-bold text-xl">wagmi charge v2</span>
            </div>
            <Button variant="outline" onClick={() => router.push("/")}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-4" variant="secondary">
            🚀 Now Supporting 4+ Cryptocurrencies
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Convert Crypto to
            <br />
            Pay Your Bills
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The easiest way to use your cryptocurrency for everyday utilities. Pay for airtime, TV subscriptions,
            electricity, and internet bills instantly.
          </p>

          <form onSubmit={handleSignup} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-8">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              required
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isLoading ? "Getting Started..." : "Get Started"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">Join 10,000+ users already using wagmi charge</p>
        </div>
      </section>

      {/* Live Crypto Prices */}
      <section className="py-12 px-4 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Live Crypto Prices</h2>
            <p className="text-muted-foreground">Real-time rates for supported cryptocurrencies</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {cryptos.map((crypto) => (
              <Card key={crypto.symbol} className="text-center">
                <CardContent className="p-4">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold text-xs">{crypto.symbol.slice(0, 2)}</span>
                  </div>
                  <div className="font-medium">{crypto.symbol}</div>
                  <div className="text-sm text-muted-foreground">{crypto.name}</div>
                  <Badge variant={crypto.change.startsWith("+") ? "default" : "destructive"} className="text-xs mt-1">
                    {crypto.change}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
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
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Simple, fast, and secure in just 3 steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground">
                Connect your MetaMask, Trust Wallet, or any supported crypto wallet
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Choose Your Service</h3>
              <p className="text-muted-foreground">Select airtime, TV subscription, electricity, or internet service</p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Pay & Enjoy</h3>
              <p className="text-muted-foreground">Complete payment with crypto and enjoy instant service delivery</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Users Say</h2>
            <p className="text-xl text-muted-foreground">Join thousands of satisfied customers</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
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

      {/* Stats Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center mb-2">
                <Users className="h-8 w-8 mr-2" />
                <span className="text-3xl font-bold">10K+</span>
              </div>
              <p className="text-blue-100">Active Users</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-8 w-8 mr-2" />
                <span className="text-3xl font-bold">$2M+</span>
              </div>
              <p className="text-blue-100">Transactions Processed</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-8 w-8 mr-2" />
                <span className="text-3xl font-bold">99.9%</span>
              </div>
              <p className="text-blue-100">Success Rate</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Globe className="h-8 w-8 mr-2" />
                <span className="text-3xl font-bold">4+</span>
              </div>
              <p className="text-blue-100">Cryptocurrencies</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Using Your Crypto?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already converting their cryptocurrency to pay for everyday services
          </p>

          <form onSubmit={handleSignup} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              required
            />
            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isLoading ? "Getting Started..." : "Get Started Free"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">W</span>
                </div>
                <span className="font-bold text-xl">wagmi charge v2</span>
              </div>
              <p className="text-muted-foreground">
                The easiest way to convert cryptocurrency to pay for everyday utilities in Nigeria.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>Airtime Top-up</li>
                <li>TV Subscriptions</li>
                <li>Electricity Bills</li>
                <li>Internet Services</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>API Documentation</li>
                <li>Status Page</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Cookie Policy</li>
                <li>Compliance</li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>© 2024 wagmi charge v2. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
