// "use client"

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Wallet, CheckCircle, ExternalLink, Link2, Unlink } from "lucide-react"
// import { getExplorerConfig } from "@/lib/explorer"

// export function WalletConnection({ wallets, linkWallet, unlinkWallet, connectedWallet }: {
//   wallets: any[],
//   linkWallet: () => void,
//   unlinkWallet: (address: string) => void,
//   connectedWallet: any
// }) {
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
//           {wallets && wallets.length > 0 ? (
//             wallets.map((wallet) => {
//               const explorer = wallet.chain ? getExplorerConfig(wallet.chain).explorer : "https://etherscan.io"
//               return (
//                 <div key={wallet.address} className="flex items-center justify-between p-3 rounded-lg border">
//                   <div className="flex items-center space-x-3">
//                     <div className="h-8 w-8 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
//                       <Wallet className="h-4 w-4 text-white" />
//                     </div>
//                     <div>
//                       <div className="font-medium">{wallet.connectorType}</div>
//                       <div className="text-sm text-muted-foreground flex items-center space-x-1">
//                         <span>{wallet.address}</span>
//                         <a href={`${explorer}/address/${wallet.address}`} target="_blank" rel="noopener noreferrer">
//                           <ExternalLink className="h-3 w-3" />
//                         </a>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="flex items-center space-x-2">
//                     <Badge variant="default" className="flex items-center space-x-1">
//                       <CheckCircle className="h-3 w-3" />
//                       <span>Connected</span>
//                     </Badge>
//                     <Button size="sm" variant="outline" onClick={() => unlinkWallet(wallet.address)}>
//                       <Unlink className="h-3 w-3 mr-1" /> Disconnect
//                     </Button>
//                   </div>
//                 </div>
//               )
//             })
//           ) : (
//             <Button size="sm" variant="outline" onClick={linkWallet}>
//               <Link2 className="h-4 w-4 mr-1" /> Connect Wallet
//             </Button>
//           )}
//         </div>
//       </CardContent>
//     </Card>
//   )
// }
// //                 )}
// //               </div>
// //             </div>
// //           ))}
// //         </div>

// //         <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-start space-x-2">
// //           <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
// //           <div className="text-sm">
// //             <p className="font-medium">Security Notice</p>
// //             <p className="text-muted-foreground">Always verify wallet connections and never share your private keys.</p>
// //           </div>
// //         </div>
// //       </CardContent>
// //     </Card>
// //   )
// // }
