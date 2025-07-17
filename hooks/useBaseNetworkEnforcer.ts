// hooks/useBaseNetworkEnforcer.ts
import { useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains'; // Import the Base chain
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';

/**
 * Custom hook to ensure the user's wallet is connected to the Base network.
 * Prompts the user to switch if they are authenticated, connected, and on a different chain.
 *
 * @returns {object} An object containing:
 * - `isOnBaseChain`: boolean indicating if the wallet is currently on the Base chain.
 * - `isSwitchingChain`: boolean indicating if a chain switch is currently in progress.
 * - `promptSwitchToBase`: A function to manually prompt the user to switch to Base.
 */
export function useBaseNetworkEnforcer() {
  const { authenticated, user } = usePrivy();
  const { isConnected, address } = useAccount();
  const currentChainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  const isOnBaseChain = currentChainId === base.id;

  // Effect to automatically prompt for chain switch
  useEffect(() => {
    if (authenticated && address && !isOnBaseChain && !isSwitchingChain) {
      toast.info("Please switch your wallet to the Base network.", { id: 'switch-chain', duration: 5000 });
      switchChain({ chainId: base.id });
    }
    // If user logs out or disconnects wallet, dismiss any lingering toast about switching
    if (authenticated === false || isConnected === false) { // Check for explicit false or disconnected
        toast.dismiss('switch-chain');
    }
  }, [authenticated, address, isOnBaseChain, isSwitchingChain, switchChain, isConnected]); // Added isConnected to dependencies

  // Function to manually trigger a switch (useful for button actions)
  const promptSwitchToBase = () => {
    if (!authenticated) {
      toast.error("Please log in to proceed.");
      return false;
    }
    if (!address) {
      toast.error("No wallet found. Please ensure a wallet is connected.");
      return false;
    }
    if (!isOnBaseChain && !isSwitchingChain) {
      toast.info("Switching to Base network...", { id: 'switch-chain-manual' });
      switchChain({ chainId: base.id });
      return false; // Indicate that a switch was prompted
    }
    return isOnBaseChain; // Indicate if already on Base
  };

  return {
    isOnBaseChain,
    isSwitchingChain,
    promptSwitchToBase,
  };
}
