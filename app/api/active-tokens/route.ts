// app/api/active-tokens/route.ts
import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';

// Create a public client for Base chain
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
});

export async function GET() {
  try {
    // Call your contract's getSupportedTokens method
    const supportedTokens = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getSupportedTokens',
    }) as string[];

    console.log('Contract returned supported tokens:', supportedTokens);

    // Return the addresses array from your contract
    return NextResponse.json({ 
      tokens: supportedTokens || [],
      success: true,
      count: supportedTokens?.length || 0
    });

  } catch (error: any) {
    console.error("Error fetching active tokens from contract:", error);
    
    // Return fallback addresses if contract call fails
    const fallbackTokens = [
      "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", // USDT
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    ];

    return NextResponse.json({ 
      tokens: fallbackTokens,
      success: false,
      error: error.message || 'Failed to fetch from contract',
      fallback: true
    }, { status: 200 }); // Return 200 with fallback data instead of 500
  }
}

// Optional: Add a POST method to manually refresh the token list
export async function POST() {
  try {
    // Force refresh the token list from contract
    const supportedTokens = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getSupportedTokens',
    }) as string[];

    return NextResponse.json({
      tokens: supportedTokens || [],
      success: true,
      refreshed: true,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      tokens: [],
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}