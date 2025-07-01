export function getExplorerConfig(chain: string) {
  switch (chain) {
    case "ethereum":
      return {
        apiUrl: process.env.NEXT_PUBLIC_ETHERSCAN_API_URL || "https://api.etherscan.io/api",
        apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY,
        explorer: "https://etherscan.io",
      }
    case "base":
      return {
        apiUrl: process.env.NEXT_PUBLIC_BASESCAN_API_URL || "https://api.basescan.org/api",
        apiKey: process.env.NEXT_PUBLIC_BASESCAN_API_KEY,
        explorer: "https://basescan.org",
      }
    // Add more chains as needed
    default:
      throw new Error("Unsupported chain")
  }
}
