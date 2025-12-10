import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
import { Hex } from 'viem'

// Your Divvi Identifier - this tracks your app's on-chain impact
const DIVVI_CONSUMER_ADDRESS = '0x70C3a7d891a984a9C7cA7a514c3B7A5A93E4b572' as Hex

/**
 * Generates a referral tag for a user transaction
 * This tag should be appended to transaction calldata to enable attribution tracking
 */
export function generateDivviReferralTag(userAddress: string): string {
  try {
    const referralTag = getReferralTag({
      user: userAddress as Hex,
      consumer: DIVVI_CONSUMER_ADDRESS,
    })
    return referralTag
  } catch (error) {
    console.error('Error generating Divvi referral tag:', error)
    return '' // Return empty string if tag generation fails
  }
}

/**
 * Registers a completed transaction with Divvi for referral tracking
 * Call this after the transaction is confirmed on-chain
 */
export async function registerDivviReferral(
  txHash: string | Hex,
  chainId: number
): Promise<void> {
  try {
    await submitReferral({
      txHash,
      chainId,
    })
    console.log(`Divvi referral registered for tx: ${txHash}`)
  } catch (error) {
    console.error('Error registering Divvi referral:', error)
    // Don't throw - referral registration failure shouldn't break the user's transaction flow
  }
}

/**
 * Appends the referral tag to transaction calldata
 * Safe to use even if tag is empty
 */
export function appendReferralTag(calldata: string, referralTag: string): string {
  if (!referralTag) return calldata
  return calldata + referralTag
}
