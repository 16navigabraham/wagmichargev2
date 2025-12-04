// lib/tokenlist.ts
export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  coingeckoId: string;
  tokenType: number; // 0 for ETH, 1+ for ERC20 tokens
  contract?: string; // ERC20 contract address (undefined for ETH)
  chainId: number; // Chain ID for the token
}

// Chain-specific Token Configurations
export const CHAIN_TOKENS: Record<number, TokenConfig[]> = {
  // Base Chain (8453)
  8453: [
    {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      coingeckoId: "usd-coin",
      tokenType: 1,
      contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      chainId: 8453,
    },
    {
      address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      coingeckoId: "tether",
      tokenType: 2,
      contract: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
      chainId: 8453,
    },
    {
      address: "0xeab49138ba2ea6dd776220fe26b7b8e446638956",
      symbol: "SEND",
      name: "SEND",
      decimals: 18,
      coingeckoId: "send-token-2",
      tokenType: 3,
      contract: "0xeab49138ba2ea6dd776220fe26b7b8e446638956",
      chainId: 8453,
    },
  ],

  // Lisk Chain (1135)
  1135: [
    {
      address: "0x05D032ac25d322df992303dCa074EE7392C117b9",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      coingeckoId: "tether",
      tokenType: 1,
      contract: "0x05D032ac25d322df992303dCa074EE7392C117b9",
      chainId: 1135,
    },
    {
      address: "0xF242275d3a6527d877f2c927a82D9b057609cc71",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      coingeckoId: "usd-coin",
      tokenType: 2,
      contract: "0xF242275d3a6527d877f2c927a82D9b057609cc71",
      chainId: 1135,
    },
  ],

  // Celo Chain (42220)
  42220: [
    {
      address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
      symbol: "cUSD",
      name: "Celo Dollar",
      decimals: 18,
      coingeckoId: "celo-dollar",
      tokenType: 1,
      contract: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
      chainId: 42220,
    },
    {
      address: "0x471EcE3750Da237f93B8E339c536989b8978a438",
      symbol: "CELO",
      name: "Celo",
      decimals: 18,
      coingeckoId: "celo",
      tokenType: 2,
      contract: "0x471EcE3750Da237f93B8E339c536989b8978a438",
      chainId: 42220,
    },
    {
      address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      coingeckoId: "tether",
      tokenType: 3,
      contract: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
      chainId: 42220,
    },
    {
      address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      coingeckoId: "usd-coin",
      tokenType: 4,
      contract: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
      chainId: 42220,
    },
  ],
};

// Legacy TOKEN_LIST for backward compatibility (defaults to Base)
export const TOKEN_LIST: TokenConfig[] = CHAIN_TOKENS[8453];

// Helper function to get tokens for a specific chain
export function getTokensForChain(chainId: number): TokenConfig[] {
  return CHAIN_TOKENS[chainId] || CHAIN_TOKENS[8453]; // Default to Base if chain not found
}

// Helper function to get token by address on a specific chain
export function getTokenByAddress(address: string, chainId?: number): TokenConfig | undefined {
  if (chainId) {
    const chainTokens = getTokensForChain(chainId);
    return chainTokens.find(token => 
      token.address.toLowerCase() === address.toLowerCase()
    );
  }
  // Search across all chains if no chainId provided
  return TOKEN_LIST.find(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}

// Helper function to get token by symbol on a specific chain
export function getTokenBySymbol(symbol: string, chainId?: number): TokenConfig | undefined {
  if (chainId) {
    const chainTokens = getTokensForChain(chainId);
    return chainTokens.find(token => 
      token.symbol.toLowerCase() === symbol.toLowerCase()
    );
  }
  // Search across all chains if no chainId provided
  return TOKEN_LIST.find(token => 
    token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

// Helper function to get active tokens from contract addresses for a specific chain
export function getActiveTokensFromAddresses(contractAddresses: string[], chainId?: number): TokenConfig[] {
  const tokenList = chainId ? getTokensForChain(chainId) : TOKEN_LIST;
  return tokenList.filter(token => 
    contractAddresses.some(addr => 
      addr.toLowerCase() === token.address.toLowerCase()
    )
  );
}

// Validate token addresses match your contract's expectations
export function validateTokenList(chainId?: number): boolean {
  const tokenList = chainId ? getTokensForChain(chainId) : TOKEN_LIST;
  const addresses = tokenList.map(t => t.address.toLowerCase());
  const uniqueAddresses = new Set(addresses);
  
  if (addresses.length !== uniqueAddresses.size) {
    console.error(`Duplicate token addresses found in TOKEN_LIST for chain ${chainId || 'all'}`);
    return false;
  }
  
  return true;
}

// Get all supported chain IDs
export function getSupportedChainIds(): number[] {
  return Object.keys(CHAIN_TOKENS).map(Number);
}