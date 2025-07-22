// app/airtime/page.tsx
"use client"
import { useState, useEffect, useCallback, useRef } from "react" // Added useRef
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {Button} from "@/components/ui/button"
import {Label} from "@/components/ui/label"
import {Badge} from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import BackToDashboard from "@/components/BackToDashboard"
import AuthGuard from "@/components/AuthGuard"
import { Input } from "@/components/ui/input"

import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config/contract";
import { ERC20_ABI } from "@/config/erc20Abi"; // Import ERC20 ABI
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'; // Removed useSimulateContract
import { usePrivy } from '@privy-io/react-auth';
import { parseEther, parseUnits, toBytes, toHex, Hex } from 'viem';
import { toast } from 'sonner';
import { TransactionStatusModal } from "@/components/TransactionStatusModal";
import { useBaseNetworkEnforcer } from '@/hooks/useBaseNetworkEnforcer'; // Import the network enforcer hook

// Base chain contract addresses (ensure these are correct for Base Mainnet)
const USDT_CONTRACT_ADDRESS = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"; // Replace with actual USDT contract on Base
const USDC_CONTRACT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Replace with actual USDC contract on Base

const CRYPTOS = [
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", tokenType: 0, decimals: 18, contract: undefined },
  { symbol: "USDT", name: "Tether", coingeckoId: "tether", tokenType: 1, decimals: 6, contract: USDT_CONTRACT_ADDRESS },
  { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", tokenType: 2, decimals: 6, contract: USDC_CONTRACT_ADDRESS },
]

const NETWORKS = [
  { serviceID: "mtn", name: "MTN" },
  { serviceID: "glo", name: "Glo" },
  { serviceID: "airtel", name: "Airtel" },
  { serviceID: "9mobile", name: "9mobile" },
]

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
}

/* ---------- fetch helpers ---------- */
async function fetchPrices() {
  const ids = CRYPTOS.map(c => c.coingeckoId).join(",")
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=ngn`)
  return res.ok ? await res.json() : {}
}

export default function AirtimePage() {
  const [crypto, setCrypto] = useState("")
  const [network, setNetwork] = useState("")
  const [amount, setAmount] = useState("")
  const [phone, setPhone] = useState("")
  const [prices, setPrices] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [requestId, setRequestId] = useState<string | undefined>(undefined);

  // --- START OF MODIFICATIONS: Transaction and Approval States ---
  const [txStatus, setTxStatus] = useState<'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' | 'backendProcessing' | 'backendSuccess' | 'backendError' | 'waitingForApprovalSignature' | 'approving' | 'approvalSuccess' | 'approvalError'>('idle');
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionHashForModal, setTransactionHashForModal] = useState<Hex | undefined>(undefined);

  const [approvalError, setApprovalError] = useState<string | null>(null);
  const backendRequestSentRef = useRef<Hex | null>(null); // Added to track if backend request has been sent
  // --- END OF MODIFICATIONS ---

  const { connectWallet, authenticated, user } = usePrivy();
  const { isConnected, address } = useAccount();

  // --- START OF MODIFICATIONS: Network Enforcer Hook ---
  const { isOnBaseChain, isSwitchingChain, promptSwitchToBase } = useBaseNetworkEnforcer();
  // --- END OF MODIFICATIONS ---

  /* initial load */
  useEffect(() => {
    fetchPrices().then(setPrices).finally(() => setLoading(false))
  }, [])

  /* requestId generator */
  useEffect(() => {
    if ((crypto || network || amount || phone) && !requestId) {
      setRequestId(generateRequestId());
    } else if (!(crypto || network || amount || phone) && requestId) {
      setRequestId(undefined);
    }
  }, [crypto, network, amount, phone, requestId]);

  /* derived values */
  const selectedCrypto = CRYPTOS.find(c => c.symbol === crypto)
  const priceNGN = selectedCrypto ? prices[selectedCrypto.coingeckoId]?.ngn : null
  const amountNGN = Number(amount) || 0
  const cryptoNeeded = priceNGN && amountNGN ? amountNGN / priceNGN : 0

  // For the main contract call, use the exact amount needed.
  // FIX: Use selectedCrypto.decimals for toFixed to ensure correct precision
  const tokenAmountForOrder = selectedCrypto ? parseUnits(cryptoNeeded.toFixed(selectedCrypto.decimals), selectedCrypto.decimals) : BigInt(0);
  const valueForEth = selectedCrypto?.symbol === 'ETH' && cryptoNeeded > 0
      ? parseEther(cryptoNeeded.toFixed(18)) // ETH needs full 18 decimals for parseEther
      : BigInt(0);
  const bytes32RequestId: Hex = toHex(toBytes(requestId || ""), { size: 32 });

  // For approval, use the maximum uint256 value for unlimited approval.
  const unlimitedApprovalAmount = parseUnits('115792089237316195423570985008687907853269984665640564039457584007913129639935', 0);

  // Wagmi Hooks for TOKEN APPROVAL Transaction
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending, isError: isApproveError, error: approveWriteError } = useWriteContract();

  const { isLoading: isApprovalConfirming, isSuccess: isApprovalTxConfirmed, isError: isApprovalConfirmError, error: approveConfirmError } = useWaitForTransactionReceipt({
      hash: approveHash as Hex,
      query: {
          enabled: Boolean(approveHash),
          refetchInterval: 1000,
      },
  });

  // Wagmi Hooks for MAIN PAYMENT Transaction
  const { writeContract, data: hash, isPending: isWritePending, isError: isWriteError, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({
    hash: hash as Hex,
    query: {
      enabled: Boolean(hash),
      refetchInterval: 1000,
    },
  });

  // Fixed handlePostTransaction definition
  const handlePostTransaction = useCallback(async (transactionHash: Hex) => {
    // Use the ref to ensure the request is sent only once for a given transactionHash
    if (backendRequestSentRef.current === transactionHash) {
      console.log(`Backend request already sent for hash: ${transactionHash}. Skipping duplicate.`);
      return;
    }

    backendRequestSentRef.current = transactionHash;

    setTxStatus('backendProcessing');
    setBackendMessage("Processing your order...");
    toast.loading("Processing order with VTpass...", { id: 'backend-status' });

    try {
      const backendResponse = await fetch('/api/airtime', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          phone,
          serviceID: network,
          amount: amountNGN,
          cryptoUsed: cryptoNeeded,
          cryptoSymbol: selectedCrypto?.symbol,
          transactionHash,
          userAddress: address
        }),
      });

      // FIX: Check if response is ok before attempting to parse JSON
      if (!backendResponse.ok) {
        // For error responses, try to get error message
        let errorMessage;
        try {
          const errorData = await backendResponse.json();
          errorMessage = errorData.message || errorData.error || `HTTP ${backendResponse.status}: ${backendResponse.statusText}`;
        } catch (jsonError) {
          // If JSON parsing fails, use status text
          errorMessage = `HTTP ${backendResponse.status}: ${backendResponse.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      const responseData = await backendResponse.json();
      
      setTxStatus('backendSuccess');
      setBackendMessage("Airtime delivered successfully!");
      toast.success("Airtime delivered successfully!", { id: 'backend-status' });
      
      // Reset form for next transaction
      setCrypto("");
      setNetwork("");
      setAmount("");
      setPhone("");
      setRequestId(undefined);
      backendRequestSentRef.current = null;
      
    } catch (backendError: any) {
      setTxStatus('backendError');
      const msg = `Backend processing failed: ${backendError.message}. Please contact support with Request ID: ${requestId}`;
      setBackendMessage(msg);
      console.error("Backend API call failed:", backendError);
      toast.error(msg, { id: 'backend-status' });
      // Do NOT clear backendRequestSentRef here to prevent re-attempts
    }
  }, [requestId, phone, network, amountNGN, cryptoNeeded, selectedCrypto?.symbol, address]);

  // Effect to monitor approval transaction status
  useEffect(() => {
    if (!showTransactionModal) return; // Only run if modal is open

    if (isApprovePending) {
        setTxStatus('waitingForApprovalSignature');
        setTransactionHashForModal(undefined);
        setTransactionError(null);
        setBackendMessage(null);
        setApprovalError(null);
        toast.info("Awaiting token approval signature...");
        backendRequestSentRef.current = null; // Reset backend request flag on new blockchain tx initiation
    } else if (approveHash && !isApprovalTxConfirmed && !isApprovalConfirming) {
        setTxStatus('sending'); // Use 'sending' for approval hash available but not yet confirming
        setTransactionHashForModal(approveHash);
        toast.loading("Token approval sent, waiting for confirmation...", { id: 'approval-status' });
    } else if (isApprovalConfirming) {
        setTxStatus('approving'); // Use 'approving' when it's actively confirming
        setTransactionHashForModal(approveHash);
        toast.loading("Token approval confirming on blockchain...", { id: 'approval-status' });
    } else if (isApprovalTxConfirmed) {
        setTxStatus('approvalSuccess');
        setApprovalError(null);
        toast.success("Token approved for unlimited spending! Proceeding with payment...", { id: 'approval-status' });
        console.log("Approval: Blockchain confirmed! Initiating main transaction...");
    } else if (isApproveError || isApprovalConfirmError) {
        setTxStatus('approvalError');
        const errorMsg = (approveWriteError?.message || approveConfirmError?.message || "Token approval failed").split('\n')[0];
        setApprovalError(errorMsg);
        setTransactionError(errorMsg); // Propagate to general transaction error for modal
        toast.error(`Approval failed: ${errorMsg}`, { id: 'approval-status' });
    }
  }, [isApprovePending, approveHash, isApprovalTxConfirmed, isApprovalConfirming, isApproveError, isApprovalConfirmError, approveWriteError, approveConfirmError, showTransactionModal]);

  // Add this useEffect to handle automatic main transaction after approval
  useEffect(() => {
    if (isApprovalTxConfirmed && txStatus === 'approvalSuccess' && selectedCrypto && selectedCrypto.tokenType !== 0) {
      // Approval confirmed, now initiate main transaction
      console.log("Approval confirmed! Initiating main transaction...");
      toast.success("Token approved! Proceeding with payment...", { id: 'approval-status' });
      
      try {
        setTxStatus('waitingForSignature');
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'createOrder',
          args: [
            bytes32RequestId,
            selectedCrypto.tokenType as any,
            tokenAmountForOrder,
          ],
          value: BigInt(0), // Always 0 for ERC20 tokens
        });
      } catch (error: any) {
        console.error("Error sending main transaction after approval:", error);
        const errorMsg = error.message || "Failed to send main transaction after approval.";
        setTransactionError(errorMsg);
        setTxStatus('error');
        toast.error(errorMsg);
      }
    }
  }, [isApprovalTxConfirmed, txStatus, selectedCrypto, bytes32RequestId, tokenAmountForOrder, writeContract]);

  // Effect to monitor main transaction status
  useEffect(() => {
    if (!showTransactionModal) return; // Only run if modal is open
    // Skip if we are in an approval flow
    if (['waitingForApprovalSignature', 'approving', 'approvalSuccess', 'approvalError'].includes(txStatus)) {
        return;
    }

    if (isWritePending) {
        setTxStatus('waitingForSignature');
        setTransactionHashForModal(undefined);
        setTransactionError(null);
        setBackendMessage(null);
        toast.info("Awaiting wallet signature...");
        backendRequestSentRef.current = null; // Reset backend request flag on new blockchain tx initiation
    } else if (hash && !isConfirmed && !isConfirming) {
        setTxStatus('sending');
        setTransactionHashForModal(hash);
        toast.loading("Transaction sent, waiting for blockchain confirmation...", { id: 'tx-status' });
    } else if (isConfirming) {
        setTxStatus('confirming');
        setTransactionHashForModal(hash);
        toast.loading("Transaction confirming on blockchain...", { id: 'tx-status' });
    } else if (isConfirmed) {
        // FIX: Add a guard to ensure handlePostTransaction is called only once per confirmed hash
        if (txStatus !== 'backendProcessing' && txStatus !== 'backendSuccess' && txStatus !== 'backendError') {
            setTxStatus('success');
            setTransactionHashForModal(hash);
            toast.success("Blockchain transaction confirmed! Processing order...", { id: 'tx-status' });
            if (hash) {
                handlePostTransaction(hash);
            }
        }
    } else if (isWriteError || isConfirmError) {
        setTxStatus('error');
        const errorMsg = (writeError?.message?.split('\n')[0] || confirmError?.message?.split('\n')[0] || "Wallet transaction failed or was rejected.").split('\n')[0];
        setTransactionError(errorMsg);
        setTransactionHashForModal(hash); // Keep hash if available for error context
        toast.error(`Transaction failed: ${errorMsg}`, { id: 'tx-status' });
    } else {
        // Reset to idle if no active transaction state and modal is still open,
        // but avoid resetting if another part of the flow (like backend processing) is active
        if (!['backendProcessing', 'backendSuccess', 'backendError'].includes(txStatus)) {
            setTxStatus('idle');
            setTransactionError(null);
            setBackendMessage(null);
            setTransactionHashForModal(undefined);
        }
    }
  }, [isWritePending, hash, isConfirming, isConfirmed, isWriteError, isConfirmError, writeError, confirmError, txStatus, handlePostTransaction, showTransactionModal]);

  const ensureWalletConnected = async () => {
    if (!authenticated) {
      toast.error("Please log in to proceed.");
      await connectWallet();
      return false;
    }
    if (!address) {
      toast.error("No wallet found. Please ensure a wallet is connected via Privy.");
      await connectWallet();
      return false;
    }
    // Use the network enforcer hook
    if (!isOnBaseChain) {
        promptSwitchToBase();
        return false;
    }
    return true;
  };

  // Simplified handlePurchase without simulations
  const handlePurchase = async () => {
    // Show modal immediately on purchase attempt
    setShowTransactionModal(true);
    setTransactionError(null);
    setBackendMessage(null);
    setApprovalError(null);
    setTxStatus('idle');
    backendRequestSentRef.current = null;

    const walletConnectedAndOnBase = await ensureWalletConnected();
    if (!walletConnectedAndOnBase) {
      setShowTransactionModal(false);
      return;
    }

    if (!address) {
      toast.error("Wallet address not found after connection. Please refresh and try again.");
      setTxStatus('error');
      return;
    }
    if (!requestId) {
      toast.error("Request ID not generated. Please fill all form details.");
      setTxStatus('error');
      return;
    }
    if (amountNGN <= 0) {
      toast.error("Please enter a valid amount.");
      setTxStatus('error');
      return;
    }

    if (!selectedCrypto) {
      toast.error("Please select a cryptocurrency.");
      setTxStatus('error');
      return;
    }

    console.log("--- Initiating Contract Call ---");
    console.log("RequestId (bytes32):", bytes32RequestId);
    console.log("TokenType:", selectedCrypto.tokenType);
    console.log("TokenAmount for Order (parsed):", tokenAmountForOrder.toString());
    console.log("Value (for ETH, 0 for ERC20):", valueForEth.toString());
    console.log("Selected Crypto:", selectedCrypto.symbol);
    console.log("Crypto Needed (float):", cryptoNeeded);
    console.log("Selected Crypto Decimals:", selectedCrypto.decimals);
    console.log("--------------------------------");

    // Handle ERC20 tokens (USDT, USDC) - Need approval first
    if (selectedCrypto.tokenType !== 0) {
      if (!selectedCrypto.contract) {
        toast.error("Selected crypto has no contract address for approval.");
        setTxStatus('error');
        return;
      }

      toast.info("Approving token spend for this transaction...");
      setTxStatus('waitingForApprovalSignature');
      
      try {
        // Direct approval call without simulation
        writeApprove({
          address: selectedCrypto.contract as Hex,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS, unlimitedApprovalAmount],
        });
      } catch (error: any) {
        console.error("Error sending approval transaction:", error);
        const errorMsg = error.message || "Failed to send approval transaction.";
        setApprovalError(errorMsg);
        setTransactionError(errorMsg);
        setTxStatus('approvalError');
        toast.error(errorMsg);
      }
    } else {
      // Handle ETH - Direct payment without approval
      try {
        setTxStatus('waitingForSignature');
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'createOrder',
          args: [
            bytes32RequestId,
            selectedCrypto.tokenType as any,
            tokenAmountForOrder,
          ],
          value: valueForEth,
        });
      } catch (error: any) {
        console.error("Error sending main transaction:", error);
        const errorMsg = error.message || "Failed to send transaction.";
        setTransactionError(errorMsg);
        setTxStatus('error');
        toast.error(errorMsg);
      }
    }
  };

  // FIX: Wrapped handleCloseModal in useCallback
  const handleCloseModal = useCallback(() => {
    setShowTransactionModal(false);
    setTxStatus('idle'); // Reset status to idle when modal closes
    setTransactionError(null); // Clear any errors
    setBackendMessage(null); // Clear backend messages
    setTransactionHashForModal(undefined); // Clear hash
    setApprovalError(null); // Clear approval specific errors
    backendRequestSentRef.current = null; // Clear ref on modal close to allow new transactions
  }, []); // Empty dependency array as it doesn't depend on any changing state

  const canPay =
    crypto &&
    network &&
    amount &&
    amountNGN >= 100 &&
    phone &&
    priceNGN &&
    requestId;

  // Simplified button disabled logic (remove simulation checks)
  const isButtonDisabled = loading || !canPay ||
                           isApprovePending || isApprovalConfirming ||
                           isWritePending || isConfirming || txStatus === 'backendProcessing' ||
                           !isOnBaseChain || isSwitchingChain;

  if (loading) return <div className="p-10 text-center">Loading…</div>

  return (
    <AuthGuard>
      <div className="container py-10 max-w-xl mx-auto">
        <BackToDashboard />
        <h1 className="text-3xl font-bold mb-4">Buy Airtime</h1>
        <p className="text-muted-foreground mb-8">
          Purchase airtime using USDT, USDC, or ETH on Base chain.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Crypto to Airtime Payment</CardTitle>
            <CardDescription>
              Preview and calculate your airtime purchase with crypto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* crypto */}
            <div className="space-y-2">
              <Label htmlFor="crypto-select">Pay With</Label>
              <Select value={crypto} onValueChange={setCrypto}>
                <SelectTrigger id="crypto-select">
                  <SelectValue placeholder="Select crypto" />
                </SelectTrigger>
                <SelectContent>
                  {CRYPTOS.map(c => (
                    <SelectItem key={c.symbol} value={c.symbol}>
                      {c.symbol} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* network */}
            <div className="space-y-2">
              <Label htmlFor="network-select">Network Provider</Label>
              <Select value={network} onValueChange={setNetwork}>
                <SelectTrigger id="network-select">
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {NETWORKS.map(n => (
                    <SelectItem key={n.serviceID} value={n.serviceID}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* amount */}
            <div className="space-y-2">
              <Label htmlFor="amount-input">Amount (NGN)</Label>
              <Input
                id="amount-input"
                type="number"
                placeholder="Enter amount (min. ₦100)"
                value={amount}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "" || val === "0") {
                      setAmount("");
                  } else {
                      setAmount(String(Math.max(0, parseInt(val))));
                  }
                }}
                min="100"
                disabled={!selectedCrypto}
              />
              {amountNGN > 0 && priceNGN && selectedCrypto && (
                <div className="text-sm text-muted-foreground flex items-center justify-between">
                  <span>
                    You will pay: ~{cryptoNeeded.toFixed(selectedCrypto.decimals)}{" "} {/* Adjusted toFixed for display */}
                    {selectedCrypto.symbol}
                  </span>
                  <Badge variant="secondary">
                    1 {selectedCrypto.symbol} = ₦{priceNGN?.toLocaleString()}
                  </Badge>
                </div>
              )}
              {amountNGN > 0 && amountNGN < 100 && (
                <p className="text-sm text-red-500">Minimum amount is ₦100.</p>
              )}
              {amountNGN > 100 && amountNGN < 50000 && (
                <p className="text-sm text-red-500">Maximum amount is ₦50,000.</p>
              )}
            </div>

            {/* phone */}
            <div className="space-y-2">
              <Label htmlFor="phone-input">Phone Number</Label>
              <Input
                id="phone-input"
                type="tel"
                placeholder="Enter phone number"
                value={phone}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, "")
                  setPhone(v.slice(0, 11)) // Max 11 digits for Nigerian numbers
                }}
                maxLength={11}
              />
            </div>

            {/* summary */}
            <div className="border-t pt-4 space-y-2 text-sm">
              {requestId && (
                <div className="flex justify-between">
                  <span>Request ID:</span>
                  <span className="text-muted-foreground font-mono text-xs">{requestId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Amount (NGN):</span>
                <span>
                  {amountNGN > 0 ? `₦${amountNGN.toLocaleString()}` : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>You will pay:</span>
                <span>
                  {cryptoNeeded > 0 && selectedCrypto ? (
                    <Badge variant="outline">
                      {cryptoNeeded.toFixed(selectedCrypto.decimals)}{" "} {/* Adjusted toFixed for display */}
                      {selectedCrypto.symbol}
                    </Badge>
                  ) : (
                    "--"
                  )}
                </span>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handlePurchase}
              // disabled={isButtonDisabled}
            >
              {isSwitchingChain ? "Switching Network..." :
              !isOnBaseChain ? "Switch to Base Network" :
              isApprovePending ? "Awaiting Approval Signature..." :
              isApprovalConfirming ? "Approving Token..." :
              txStatus === 'waitingForSignature' ? "Awaiting Payment Signature..." :
              txStatus === 'sending' ? "Sending Transaction..." :
              txStatus === 'confirming' ? "Confirming Blockchain..." :
              txStatus === 'success' ? "Blockchain Confirmed!" :
              txStatus === 'backendProcessing' ? "Processing Order..." :
              txStatus === 'backendSuccess' ? "Payment Successful!" :
              txStatus === 'backendError' ? "Payment Failed - Try Again" :
              txStatus === 'error' ? "Blockchain Failed - Try Again" :
              canPay ? "Purchase Airtime" :
              "Fill all details"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <TransactionStatusModal
        isOpen={showTransactionModal}
        onClose={handleCloseModal}
        txStatus={txStatus}
        transactionHash={transactionHashForModal}
        errorMessage={transactionError || approvalError}
        backendMessage={backendMessage}
        requestId={requestId}
      />
    </AuthGuard>
  )
}