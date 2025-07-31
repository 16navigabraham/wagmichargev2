// lib/tokenUtils.ts
import { TOKEN_LIST, getActiveTokensFromAddresses, TokenConfig } from "./tokenlist";

/**
 * Reusable utility to fetch active tokens from contract and map to full token configs
 * Can be used across multiple components that need token data
 */
export async function fetchActiveTokensWithMetadata(): Promise<TokenConfig[]> {
  try {
    const res = await fetch("/api/active-tokens");
    if (!res.ok) {
      console.warn("Failed to fetch active tokens from contract, using fallback");
      return TOKEN_LIST; // Fallback to all tokens
    }
    
    const data = await res.json();
    const contractAddresses = Array.isArray(data.tokens) ? data.tokens : [];
    
    // Map contract addresses to full token configs
    const activeTokens = getActiveTokensFromAddresses(contractAddresses);
    
    // If no matches found, fallback to all tokens
    if (activeTokens.length === 0) {
      console.warn("No matching tokens found, using full token list");
      return TOKEN_LIST;
    }
    
    console.log(`Loaded ${activeTokens.length} active tokens:`, activeTokens.map(t => t.symbol));
    return activeTokens;
  } catch (error) {
    console.error("Error fetching active tokens:", error);
    return TOKEN_LIST; // Fallback to all tokens
  }
}