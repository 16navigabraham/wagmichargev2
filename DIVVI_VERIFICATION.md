# How to Verify Your Divvi Transaction

## Quick Check (Recommended)

1. **Get your transaction hash** from Lisk:
   - Visit: https://blockscout.lisk.com (Lisk explorer)
   - Search for your transaction or wallet address
   - Copy the transaction hash (starts with `0x`)

2. **Access Divvi Dashboard**:
   - Go to: https://dashboard.divvi.io (or check Divvi's website)
   - Login/Connect with your Divvi consumer address: `0x70C3a7d891a984a9C7cA7a514c3B7A5A93E4b572`

3. **Check Recent Transactions**:
   - You should see your Paycrypt transaction listed
   - Status should show "Registered" or "Confirmed"
   - Attribution should credit Paycrypt

## Manual Verification (Advanced)

If you want to verify directly on-chain:

### On Lisk Blockchain

1. **Your Transaction**:
   - Hash: Your Lisk transaction hash
   - Chain: Lisk (Chain ID: 1135)
   - Explorer: https://blockscout.lisk.com

2. **DivviRegistry Contract**:
   - Look for `ReferralRegistered` events
   - Filter by topic3 (rewardsConsumer): `0x70C3a7d891a984a9C7cA7a514c3B7A5A93E4b572`
   - Should show your transaction registered

### Check Event Data

The `ReferralRegistered` event contains:
```
Event: ReferralRegistered
├─ topic1 (txHash): Your transaction hash
├─ topic2 (user): Your wallet address
├─ topic3 (rewardsConsumer): 0x70C3a7d891a984a9C7cA7a514c3B7A5A93E4b572
└─ chainId: 1135 (Lisk)
```

## What Success Looks Like

✅ **Transaction Registered Successfully**:
- [ ] Transaction confirmed on Lisk
- [ ] Event appears in DivviRegistry
- [ ] Dashboard shows transaction
- [ ] Status: "Registered"
- [ ] Rewards: Accumulating

## Troubleshooting

**Transaction not showing up?**
1. Wait 2-3 minutes for confirmation
2. Check transaction hash is correct
3. Verify it's on Lisk (Chain ID 1135)
4. Ensure transaction actually succeeded

**Dashboard not loading?**
1. Check Divvi website for status
2. Clear browser cache
3. Try different browser
4. Check network connection

**Rewards not accumulating?**
1. Verify consumer address is correct
2. Check if DivviRegistry recognizes your address
3. Contact Divvi support with transaction hash

## Support

- **Paycrypt Support**: support@paycrypt.org
- **Divvi Docs**: https://docs.divvi.io
- **Divvi Dashboard**: https://dashboard.divvi.io
- **Lisk Explorer**: https://blockscout.lisk.com

## Next Transactions

All future Paycrypt transactions will automatically be registered with Divvi! Just keep using the platform as normal.
