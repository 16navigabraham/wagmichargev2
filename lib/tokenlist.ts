// lib/tokenlist.ts
export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  coingeckoId: string;
  tokenType: number; // 0 for ETH, 1+ for ERC20 tokens
  contract?: string; // ERC20 contract address (undefined for ETH)
}

// Base Chain Token Configurations
export const TOKEN_LIST: TokenConfig[] = [
  {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    coingeckoId: "usd-coin",
    tokenType: 1,
    contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  {
    address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", // USDT on Base
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    coingeckoId: "tether",
    tokenType: 2,
    contract: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
  },
  {
    address: "0xeab49138ba2ea6dd776220fe26b7b8e446638956", // SEND on Base
    symbol: "SEND",
    name: "SEND",
    decimals: 18,
    coingeckoId: "send-token-2",
    tokenType: 2,
    contract: "0xeab49138ba2ea6dd776220fe26b7b8e446638956",
  },
];

// Helper function to get token by address
export function getTokenByAddress(address: string): TokenConfig | undefined {
  return TOKEN_LIST.find(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}

// Helper function to get token by symbol
export function getTokenBySymbol(symbol: string): TokenConfig | undefined {
  return TOKEN_LIST.find(token => 
    token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

// Helper function to get active tokens from contract addresses
export function getActiveTokensFromAddresses(contractAddresses: string[]): TokenConfig[] {
  return TOKEN_LIST.filter(token => 
    contractAddresses.some(addr => 
      addr.toLowerCase() === token.address.toLowerCase()
    )
  );
}

// Validate token addresses match your contract's expectations
export function validateTokenList(): boolean {
  const addresses = TOKEN_LIST.map(t => t.address.toLowerCase());
  const uniqueAddresses = new Set(addresses);
  
  if (addresses.length !== uniqueAddresses.size) {
    console.error("Duplicate token addresses found in TOKEN_LIST");
    return false;
  }
  
  return true;
}