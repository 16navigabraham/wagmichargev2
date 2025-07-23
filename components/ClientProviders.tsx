// components/ClientProviders.tsx
"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { PrivyProvider } from "@privy-io/react-auth"
import { WagmiConfig, createConfig, http } from 'wagmi';
import { base as wagmiBase } from 'wagmi/chains'; // Import Base Mainnet chain from wagmi/chains
import { base as viemBase } from 'viem/chains'; // Import Base Mainnet chain from viem/chains for Privy config
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // For Wagmi's internal use
import { Toaster, toast } from 'sonner'; // For toast notifications, import toast explicitly

// Import hooks needed for the chain checker component
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth'; // Import usePrivy here for ChainChecker

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

// NEW COMPONENT: This component will check the connected chain and prompt the user
// if they are not on Base. It renders nothing visually.
function ChainChecker() {
  const { isConnected, address } = useAccount(); // Wagmi hook to get account info
  const currentChainId = useChainId(); // Wagmi hook to get current chain ID
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain(); // Wagmi hook to switch chain
  const { authenticated, ready } = usePrivy(); // Privy hook to check authentication and readiness

  useEffect(() => {
    // Only proceed if Privy is ready, user is authenticated, wallet is connected,
    // and they are not currently on Base chain, and a switch is not already pending.
    if (ready && authenticated && isConnected && address && currentChainId !== wagmiBase.id && !isSwitchingChain) {
      console.log(`[ChainChecker] Detected wrong chain (ID: ${currentChainId}). Attempting to switch to Base (ID: ${wagmiBase.id}).`);
      toast.info("Please switch your wallet to the Base network.", { id: 'switch-chain', duration: 5000 });
      switchChain({ chainId: wagmiBase.id });
    }
    // If user logs out or disconnects wallet, dismiss any lingering toast about switching
    if (ready && (!authenticated || !isConnected)) {
        toast.dismiss('switch-chain');
    }
  }, [ready, authenticated, isConnected, address, currentChainId, isSwitchingChain, switchChain]);

  return null; // This component does not render any UI elements itself
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
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
            {/* Render the ChainChecker component here. It will run its effect regardless of other children. */}
            <ChainChecker />
            {children}
            {/* Sonner Toaster for displaying notifications */}
            <Toaster richColors />
          </ThemeProvider>
        </QueryClientProvider>
      </WagmiConfig>
    </PrivyProvider>
  )
}