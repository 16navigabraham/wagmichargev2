// hooks/useBaseNetworkEnforcer.ts
import { useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { base, lisk, celo } from 'wagmi/chains';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { CONTRACTS } from '@/config/contract';

// Supported chain IDs
const SUPPORTED_CHAINS = [base.id, lisk.id, celo.id];

/**
 * Custom hook to ensure the user's wallet is connected to a supported network.
 * Supports Base, Lisk, and Celo chains.
 *
 * @returns {object} An object containing:
 * - `isOnSupportedChain`: boolean indicating if the wallet is on a supported chain.
 * - `currentChain`: object with chain details (name, id, contractAddress, explorer).
 * - `isSwitchingChain`: boolean indicating if a chain switch is in progress.
 * - `promptSwitchToBase`: A function to manually prompt the user to switch to Base.
 * - `supportedChains`: array of supported chain names.
 */
export function useBaseNetworkEnforcer() {
  const { authenticated, user } = usePrivy();
  const { isConnected, address } = useAccount();
  const currentChainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  const isOnSupportedChain = SUPPORTED_CHAINS.includes(currentChainId);
  const isOnBaseChain = currentChainId === base.id;
  
  // Get current chain details
  const getCurrentChain = () => {
    const chainConfig = Object.values(CONTRACTS).find(c => c.chainId === currentChainId);
    if (chainConfig) {
      return {
        name: chainConfig.name,
        id: chainConfig.chainId,
        contractAddress: chainConfig.address,
        explorer: chainConfig.explorer,
      };
    }
    return null;
  };

  const currentChain = getCurrentChain();

  // Effect to notify if on unsupported chain (but don't auto-switch)
  useEffect(() => {
    if (authenticated && address && !isOnSupportedChain && !isSwitchingChain) {
      toast.warning("Please switch to a supported network (Base, Lisk, or Celo).", { 
        id: 'switch-chain', 
        duration: 8000 
      });
    }
    // Dismiss toast on logout/disconnect
    if (authenticated === false || isConnected === false) {
      toast.dismiss('switch-chain');
    }
  }, [authenticated, address, isOnSupportedChain, isSwitchingChain, isConnected]);

  // Function to manually trigger a switch to Base (useful for button actions)
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
      return false;
    }
    return isOnBaseChain;
  };

  return {
    isOnBaseChain,
    isOnSupportedChain,
    currentChain,
    isSwitchingChain,
    promptSwitchToBase,
    supportedChains: ['Base', 'Lisk', 'Celo'],
  };
}
