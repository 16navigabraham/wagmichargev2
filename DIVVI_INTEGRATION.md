# Divvi Integration Guide

## Overview
Paycrypt is now integrated with **Divvi**, a smart contract protocol that enables permissionless rewards for driving on-chain activity and user growth.

## What This Means
Every transaction made through Paycrypt (airtime, data, electricity, TV subscriptions) is now tracked by Divvi. This allows Paycrypt to:
- **Earn rewards** for driving on-chain activity
- **Track user referrals** and their on-chain behavior
- **Measure impact** of the platform
- **Receive attribution** for user growth

## Technical Implementation

### Installation
```bash
npm install @divvi/referral-sdk
```

### Integration Points
The Divvi integration has been added to all payment pages:
1. **`app/airtime/page.tsx`** - Airtime purchases
2. **`app/internet/page.tsx`** - Data bundle purchases
3. **`app/electricity/page.tsx`** - Electricity bill payments
4. **`app/tv/page.tsx`** - TV subscription payments

### How It Works

#### 1. Divvi Utility Module (`lib/divvi.ts`)
Created a reusable module with three key functions:

```typescript
// Generate a referral tag for a user
generateDivviReferralTag(userAddress: string): string

// Register a completed transaction with Divvi
registerDivviReferral(txHash: string, chainId: number): Promise<void>

// Append referral tag to transaction calldata
appendReferralTag(calldata: string, referralTag: string): string
```

#### 2. Transaction Flow
When a user completes a transaction:

1. **Transaction Sent**: User signs and sends the transaction
2. **Transaction Confirmed**: Transaction is mined and confirmed on-chain
3. **Divvi Registration**: Automatically registers the transaction with Divvi using:
   - Transaction hash
   - Chain ID (Base: 8453, Lisk: 1135, Celo: 42220)
4. **Backend Processing**: Order is processed by Paycrypt backend

**Key Code Change** (example from airtime page):
```typescript
} else if (isConfirmed) {
  if (txStatus !== 'backendProcessing' && txStatus !== 'backendSuccess' && txStatus !== 'backendError') {
    setTxStatus('success');
    toast.success("Blockchain transaction confirmed! Processing order...");
    
    if (hash) {
      // Register transaction with Divvi for rewards tracking
      registerDivviReferral(hash, chainId).catch(err => {
        console.error('Divvi registration failed (non-critical):', err);
      });
      
      // Continue with backend processing
      handlePostTransaction(hash);
    }
  }
}
```

### Divvi Configuration

**Consumer Address (Paycrypt Identifier)**:
```
0x70C3a7d891a984a9C7cA7a514c3B7A5A93E4b572
```

This address identifies Paycrypt in the Divvi ecosystem and receives attribution for all tracked transactions.

## Non-Critical Failures
The Divvi registration is wrapped in error handling that doesn't interrupt the user's transaction flow:
```typescript
registerDivviReferral(hash, chainId).catch(err => {
  console.error('Divvi registration failed (non-critical):', err);
  // Transaction still processes successfully even if Divvi registration fails
});
```

## Verification
To verify Divvi integration is working:

1. **Check DivviRegistry Contract**:
   - Look for "ReferralRegistered" events
   - Filter by topic3 (rewardsConsumer) = `0x70C3a7d891a984a9C7cA7a514c3B7A5A93E4b572`

2. **Use Divvi Verification Tool**:
   - Divvi provides a tool to verify that referrals have been registered correctly
   - Link: https://divvi.io (check their documentation)

3. **Monitor Rewards**:
   - Rewards are calculated automatically by Divvi
   - Dashboard: Check Divvi's rewards dashboard with your consumer address

## Supported Networks
- **Base**: Chain ID 8453
- **Lisk**: Chain ID 1135
- **Celo**: Chain ID 42220

All transactions on these networks are automatically registered with Divvi.

## Benefits

### For Paycrypt
1. **Revenue Stream**: Earn rewards for driving on-chain activity
2. **Attribution**: Get credited for user acquisition and engagement
3. **Zero Code Changes**: SDK v2 supports campaigns without code updates
4. **Permissionless**: No approval required - just add transactions

### For Users
- No change in user experience
- No additional fees
- Transactions process as normal
- Same speed and reliability

## Next Steps

1. **Monitor Dashboard**: Check Divvi rewards dashboard regularly
2. **Track Metrics**: Monitor how much volume/activity is being tracked
3. **Optimize Campaigns**: Use Divvi insights to understand user behavior
4. **Scale**: As Paycrypt grows, so do the tracked transactions and potential rewards

## Migration Notes
The Divvi Referral SDK has been upgraded to v2, which is more flexible and supports zero code changes when signing up for new campaigns. If migrating from v1 in the future, follow the migration guide on Divvi's documentation.

## Support
For questions about Divvi integration:
- Divvi Docs: https://docs.divvi.io
- Paycrypt Integration: All code is in `lib/divvi.ts`
- Implementation Examples: Check any of the payment pages
