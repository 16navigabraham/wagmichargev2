// lib/paycryptOnchain.ts
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { ERC20_ABI } from "@/config/erc20Abi";
import { createPublicClient, createWalletClient, http, Contract } from "viem";

export async function paycryptOnchain({
  userAddress,
  tokenAddress,
  amount,
  requestId,
  walletClient,
  publicClient,
}: {
  userAddress: string;
  tokenAddress: string;
  amount: bigint;
  requestId: string | number;
  walletClient: any;
  publicClient: any;
}) {
  // amount is already typed as bigint, use directly
  const safeAmount: bigint = amount;

  // 1. Get contract instances using viem
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, walletClient);
  const erc20 = new Contract(tokenAddress, ERC20_ABI, walletClient);

  // 2. Check if token is supported
  const isSupported = await contract.read.isTokenSupported([tokenAddress]);
  if (!isSupported) throw new Error("Unsupported token");

  // 3. Check if user is blacklisted
  const blacklisted = await contract.read.isBlacklisted([userAddress]);
  if (blacklisted) throw new Error("User is blacklisted");

  // 4. Check user balance
  const balance = await erc20.read.balanceOf([userAddress]);
  if (balance < safeAmount) throw new Error("Insufficient balance");

  // 5. Check allowance
  const allowance = await erc20.read.allowance([userAddress, CONTRACT_ADDRESS]);
  if (allowance < safeAmount) {
    const approveTx = await erc20.write.approve([CONTRACT_ADDRESS, safeAmount]);
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
  }

  // 6. Check order limit
  const orderLimit = await contract.read.getOrderLimit([tokenAddress]);
  if (safeAmount > orderLimit) throw new Error("Order exceeds limit");

  // 7. Create order
  const tx = await contract.write.createOrder([requestId, tokenAddress, safeAmount]);
  await publicClient.waitForTransactionReceipt({ hash: tx });
}
