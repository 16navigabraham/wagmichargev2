// components/ClientProviders.tsx
"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { PrivyProvider } from "@privy-io/react-auth"
import { WagmiConfig, createConfig, http } from 'wagmi';
import { base as wagmiBase } from 'wagmi/chains'; // Import Base Mainnet chain from wagmi/chains
import { base as viemBase } from 'viem/chains'; // Import Base Mainnet chain from viem/chains for Privy config
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // For Wagmi's internal use
import { Toaster } from 'sonner'; // For toast notifications

// 1. Create Wagmi config for Base Mainnet
const wagmiConfig = createConfig({
  chains: [wagmiBase], // Specify the chains for Wagmi
  transports: {
    [wagmiBase.id]: http(), // Use http() for public RPC for Base
  },
  syncConnectedChain: true, // Keep track of the connected chain
});

// 2. Create a react-query client instance (Wagmi uses this internally)
const queryClient = new QueryClient();

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      // FIX: Add config for PrivyProvider to specify supported and default chains
      config={{
        supportedChains: [viemBase], // Specify supported chains for Privy (using viem's base)
        defaultChain: viemBase,      // Set Base as the default chain for Privy (using viem's base)
        // You can add other Privy configurations here if needed, e.g.:
        // loginMethods: ['email', 'wallet', 'google'],
        // appearance: { theme: 'light' },
      }}
    >
      {/* WagmiConfig makes the Wagmi client available to all child components */}
      <WagmiConfig config={wagmiConfig}>
        {/* QueryClientProvider is needed for Wagmi to function */}
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
            {/* Sonner Toaster for displaying notifications */}
            <Toaster richColors />
          </ThemeProvider>
        </QueryClientProvider>
      </WagmiConfig>
    </PrivyProvider>
  )
}