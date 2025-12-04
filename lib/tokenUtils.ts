// lib/tokenUtils.ts
import { TOKEN_LIST, getActiveTokensFromAddresses, TokenConfig, getTokensForChain } from "./tokenlist";

/**
 * Reusable utility to fetch active tokens from contract and map to full token configs
 * Can be used across multiple components that need token data
 * @param chainId - Optional chain ID to fetch tokens for a specific chain
 */
export async function fetchActiveTokensWithMetadata(chainId?: number): Promise<TokenConfig[]> {
  try {
    // Get the appropriate token list for the chain
    const chainTokenList = chainId ? getTokensForChain(chainId) : TOKEN_LIST;
    
    const res = await fetch("/api/active-tokens");
    if (!res.ok) {
      console.warn(`Failed to fetch active tokens from contract, using fallback for chain ${chainId || 'default'}`);
      return chainTokenList; // Fallback to chain-specific tokens
    }
    
    const data = await res.json();
    const contractAddresses = Array.isArray(data.tokens) ? data.tokens : [];
    
    // Map contract addresses to full token configs for the specific chain
    const activeTokens = getActiveTokensFromAddresses(contractAddresses, chainId);
    
    // If no matches found, fallback to chain-specific tokens
    if (activeTokens.length === 0) {
      console.warn(`No matching tokens found for chain ${chainId || 'default'}, using full token list`);
      return chainTokenList;
    }
    
    console.log(`Loaded ${activeTokens.length} active tokens for chain ${chainId || 'default'}:`, activeTokens.map(t => t.symbol));
    return activeTokens;
  } catch (error) {
    console.error("Error fetching active tokens:", error);
    const chainTokenList = chainId ? getTokensForChain(chainId) : TOKEN_LIST;
    return chainTokenList; // Fallback to chain-specific tokens
  }
}