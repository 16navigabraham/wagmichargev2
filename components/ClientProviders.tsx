// components/ClientProviders.tsx
"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { PrivyProvider } from "@privy-io/react-auth"
import { WagmiConfig, createConfig, http } from 'wagmi';
import { base as wagmiBase, lisk as wagmiLisk, celo as wagmiCelo } from 'wagmi/chains';
import { base as viemBase, lisk as viemLisk, celo as viemCelo } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';

// Import hooks needed for the chain checker component
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

// 1. Create Wagmi config for multiple chains (Base, Lisk, Celo)
const wagmiConfig = createConfig({
  chains: [wagmiBase, wagmiLisk, wagmiCelo],
  transports: {
    [wagmiBase.id]: http(),
    [wagmiLisk.id]: http(),
    [wagmiCelo.id]: http(),
  },
  syncConnectedChain: true,
});

// 2. Create a react-query client instance (Wagmi uses this internally)
const queryClient = new QueryClient();

// Chain Checker: Notifies users if they're on an unsupported chain
function ChainChecker() {
  const { isConnected, address } = useAccount();
  const currentChainId = useChainId();
  const { authenticated, ready } = usePrivy();

  const supportedChains: number[] = [wagmiBase.id, wagmiLisk.id, wagmiCelo.id];
  const isOnSupportedChain = supportedChains.includes(currentChainId);

  useEffect(() => {
    if (ready && authenticated && isConnected && address && !isOnSupportedChain) {
      const chainNames: Record<number, string> = { [wagmiBase.id]: 'Base', [wagmiLisk.id]: 'Lisk', [wagmiCelo.id]: 'Celo' };
      const currentChainName = chainNames[currentChainId] || `Chain ${currentChainId}`;
      console.log(`[ChainChecker] Connected to ${currentChainName}. Supported chains: Base, Lisk, Celo`);
      toast.warning(
        "You're connected to an unsupported network. Please switch to Base, Lisk, or Celo.",
        { id: 'switch-chain', duration: 8000 }
      );
    }
    if (ready && (!authenticated || !isConnected)) {
      toast.dismiss('switch-chain');
    }
  }, [ready, authenticated, isConnected, address, currentChainId, isOnSupportedChain]);

  return null;
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        supportedChains: [viemBase, viemLisk, viemCelo],
        defaultChain: viemBase,
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