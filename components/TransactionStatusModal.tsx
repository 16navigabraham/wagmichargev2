// components/TransactionStatusModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react"; // Added Clock icon
import Link from "next/link";
import { Hex } from 'viem';

// Extend the txStatus types to include backend processing states
interface TransactionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  txStatus: 'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' | 'backendProcessing' | 'backendSuccess' | 'backendError';
  transactionHash?: Hex;
  errorMessage?: string | null;
  explorerUrl?: string; // Base explorer URL (e.g., "https://basescan.org")
  backendMessage?: string | null; // New prop for backend-specific messages
  requestId?: string; // <--- FIX: ADDED THIS PROP
}

export function TransactionStatusModal({
  isOpen,
  onClose,
  txStatus,
  transactionHash,
  errorMessage,
  explorerUrl = "https://basescan.org", // Default to BaseScan
  backendMessage,
  requestId // <--- FIX: DESTRUCTURED IT HERE
}: TransactionStatusModalProps) {
  const isPendingBlockchain = txStatus === 'waitingForSignature' || txStatus === 'sending' || txStatus === 'confirming';
  const isSuccessBlockchainConfirmed = txStatus === 'success'; // Renamed for clarity: blockchain confirmed, but backend might still be processing
  const isErrorBlockchain = txStatus === 'error';
  
  // New flags for backend status
  const isBackendProcessing = txStatus === 'backendProcessing';
  const isBackendSuccess = txStatus === 'backendSuccess';
  const isBackendError = txStatus === 'backendError';

  let title = "Transaction Status";
  let description = "";
  let icon = null;
  let iconColor = "";

  if (txStatus === 'waitingForSignature') {
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
  } else if (isSuccessBlockchainConfirmed) {
    // Transition state: Blockchain TX success, but waiting for backend
    title = "Blockchain Confirmed!";
    description = "Now processing your order with our payment provider...";
    icon = <Clock className="w-12 h-12 animate-spin text-green-500" />; // New icon for backend processing
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
  } else if (isErrorBlockchain) { // This is for pure blockchain transaction errors (e.g. user rejected)
    title = "Blockchain Transaction Failed";
    description = errorMessage || "The blockchain transaction could not be completed. Funds may have been refunded by the contract.";
    icon = <XCircle className="w-12 h-12 text-red-500" />;
    iconColor = "text-red-500";
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
        {/* FIX: Directly use requestId prop, and simplify condition */}
        {requestId && (txStatus !== 'idle' && txStatus !== 'waitingForSignature') && (
             <div className="mt-4 text-sm break-words">
                 <p className="font-medium">Request ID:</p>
                 <span className="text-muted-foreground font-mono text-xs">{requestId}</span>
             </div>
        )}

        <DialogFooter className="mt-6 flex justify-center">
          <Button onClick={onClose}>
            {isBackendSuccess || isBackendError || isErrorBlockchain ? "Done" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}