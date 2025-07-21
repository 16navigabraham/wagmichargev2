// components/TransactionStatusModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Clock, KeyRound } from "lucide-react"; // Added KeyRound icon for approval
import Link from "next/link";
import { Hex } from 'viem';

// Extend the txStatus types to include backend processing states AND approval states
interface TransactionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  txStatus: 'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' |
            'waitingForApprovalSignature' | 'approving' | 'approvalSuccess' | 'approvalError' | // New approval states
            'backendProcessing' | 'backendSuccess' | 'backendError';
  transactionHash?: Hex; // This will be used for both main transaction and approval transaction hash
  errorMessage?: string | null;
  explorerUrl?: string; // Base explorer URL (e.g., "https://basescan.org")
  backendMessage?: string | null;
  requestId?: string;
}

export function TransactionStatusModal({
  isOpen,
  onClose,
  txStatus,
  transactionHash,
  errorMessage,
  explorerUrl = "https://basescan.org", // Default to BaseScan
  backendMessage,
  requestId
}: TransactionStatusModalProps) {
  const isPendingBlockchain = txStatus === 'waitingForSignature' || txStatus === 'sending' || txStatus === 'confirming';
  const isSuccessBlockchainConfirmed = txStatus === 'success';
  const isErrorBlockchain = txStatus === 'error';

  const isBackendProcessing = txStatus === 'backendProcessing';
  const isBackendSuccess = txStatus === 'backendSuccess';
  const isBackendError = txStatus === 'backendError';

  // New flags for approval status
  const isWaitingForApprovalSignature = txStatus === 'waitingForApprovalSignature';
  const isApproving = txStatus === 'approving';
  const isApprovalSuccess = txStatus === 'approvalSuccess';
  const isApprovalError = txStatus === 'approvalError';

  let title = "Transaction Status";
  let description = "";
  let icon = null;
  let iconColor = "";

  if (isWaitingForApprovalSignature) {
    title = "Awaiting Approval Signature";
    description = "Please approve the token spend in your wallet to continue.";
    icon = <KeyRound className="w-12 h-12 animate-pulse text-blue-500" />;
    iconColor = "text-blue-500";
  } else if (isApproving) {
    title = "Approving Token";
    description = "Your token approval transaction is being processed on the blockchain.";
    icon = <Loader2 className="w-12 h-12 animate-spin text-yellow-500" />;
    iconColor = "text-yellow-500";
  } else if (isApprovalSuccess) {
    title = "Token Approved!";
    description = "Your token has been successfully approved. Proceeding with payment...";
    icon = <CheckCircle className="w-12 h-12 text-green-500" />;
    iconColor = "text-green-500";
  } else if (isApprovalError) {
    title = "Token Approval Failed";
    description = errorMessage || "The token approval transaction could not be completed.";
    icon = <XCircle className="w-12 h-12 text-red-500" />;
    iconColor = "text-red-500";
  }
  // Existing states for main transaction and backend processing
  else if (txStatus === 'waitingForSignature') {
    title = "Awaiting Wallet Signature";
    description = "Please confirm the transaction in your wallet.";
    icon = <Loader2 className="w-12 h-12 animate-spin text-blue-500" />;
    iconColor = "text-blue-500";
  } else if (txStatus === 'sending') {
    title = "Transaction Sent";
    description = "Your transaction is being processed on the blockchain. Waiting for confirmation...";
    icon = <Loader2 className="w-12 h-12 animate-spin text-yellow-500" />;
    iconColor = "text-yellow-500";
  } else if (txStatus === 'confirming') {
    title = "Confirming Transaction";
    description = "Your transaction is on the blockchain and awaiting final confirmation.";
    icon = <Loader2 className="w-12 h-12 animate-spin text-purple-500" />;
    iconColor = "text-purple-500";
  } else if (isErrorBlockchain) {
    title = "Blockchain Transaction Failed";
    description = errorMessage || "The blockchain transaction could not be completed. Check the explorer for details.";
    icon = <XCircle className="w-12 h-12 text-red-500" />;
    iconColor = "text-red-500";
  } else if (isSuccessBlockchainConfirmed) {
    title = "Blockchain Confirmed!";
    description = "Now processing your order with our payment provider...";
    icon = <Clock className="w-12 h-12 animate-spin text-green-500" />;
    iconColor = "text-green-500";
  } else if (isBackendProcessing) {
    title = "Processing Payment";
    description = backendMessage || "Our system is processing your payment with the service provider.";
    icon = <Loader2 className="w-12 h-12 animate-spin text-orange-500" />;
    iconColor = "text-orange-500";
  } else if (isBackendSuccess) {
    title = "Payment Successful!";
    description = backendMessage || "Your payment has been successfully processed and delivered!";
    icon = <CheckCircle className="w-12 h-12 text-green-600" />;
    iconColor = "text-green-600";
  } else if (isBackendError) {
    title = "Payment Failed";
    description = backendMessage || errorMessage || "The payment could not be completed by the service provider.";
    icon = <XCircle className="w-12 h-12 text-red-600" />;
    iconColor = "text-red-600";
  }

  const explorerLink = transactionHash ? `${explorerUrl}/tx/${transactionHash}` : '#';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-6 text-center">
        <DialogHeader className="flex flex-col items-center">
          <div className={`mb-4 ${iconColor}`}>
            {icon}
          </div>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        {transactionHash && (
          <div className="mt-4 text-sm break-words">
            <p className="font-medium">Transaction Hash:</p>
            <Link
              href={explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {transactionHash.substring(0, 6)}...{transactionHash.substring(transactionHash.length - 4)}
            </Link>
          </div>
        )}
        {requestId && (txStatus !== 'idle' && txStatus !== 'waitingForSignature' && !isWaitingForApprovalSignature) && (
          <div className="mt-4 text-sm break-words">
            <p className="font-medium">Request ID:</p>
            <span className="text-muted-foreground font-mono text-xs">{requestId}</span>
          </div>
        )}

        <DialogFooter className="mt-6 flex justify-center">
          <Button onClick={onClose}>
            {isBackendSuccess || isBackendError || isErrorBlockchain || isApprovalError ? "Done" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}