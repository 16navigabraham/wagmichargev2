// "use client"

// import { useState } from "react"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Wallet, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"

// const wallets = [
//   { name: "MetaMask", connected: true, address: "0x1234...5678" },
//   { name: "Trust Wallet", connected: false, address: null },
//   { name: "WalletConnect", connected: false, address: null },
// ]

// export function WalletConnection() {
//   const [connecting, setConnecting] = useState<string | null>(null)

//   const handleConnect = async (walletName: string) => {
//     setConnecting(walletName)
//     // Simulate connection delay
//     await new Promise((resolve) => setTimeout(resolve, 2000))
//     setConnecting(null)
//   }

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="flex items-center space-x-2">
//           <Wallet className="h-5 w-5" />
//           <span>Wallet Connection</span>
//         </CardTitle>
//         <CardDescription>Connect your crypto wallets</CardDescription>
//       </CardHeader>
//       <CardContent>
//         <div className="space-y-3">
//           {wallets.map((wallet) => (
//             <div key={wallet.name} className="flex items-center justify-between p-3 rounded-lg border">
//               <div className="flex items-center space-x-3">
//                 <div className="h-8 w-8 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
//                   <Wallet className="h-4 w-4 text-white" />
//                 </div>
//                 <div>
//                   <div className="font-medium">{wallet.name}</div>
//                   {wallet.connected && wallet.address && (
//                     <div className="text-sm text-muted-foreground flex items-center space-x-1">
//                       <span>{wallet.address}</span>
//                       <ExternalLink className="h-3 w-3" />
//                     </div>
//                   )}
//                 </div>
//               </div>
//               <div className="flex items-center space-x-2">
//                 {wallet.connected ? (
//                   <Badge variant="default" className="flex items-center space-x-1">
//                     <CheckCircle className="h-3 w-3" />
//                     <span>Connected</span>
//                   </Badge>
//                 ) : (
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     onClick={() => handleConnect(wallet.name)}
//                     disabled={connecting === wallet.name}
//                   >
//                     {connecting === wallet.name ? "Connecting..." : "Connect"}
//                   </Button>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>

//         <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-start space-x-2">
//           <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
//           <div className="text-sm">
//             <p className="font-medium">Security Notice</p>
//             <p className="text-muted-foreground">Always verify wallet connections and never share your private keys.</p>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   )
// }
