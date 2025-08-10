import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Clock, KeyRound, Printer, Copy, Check } from "lucide-react";
import Link from "next/link";
import { Hex } from 'viem';
import { useState } from 'react';

interface TransactionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  txStatus: 'idle' | 'waitingForSignature' | 'sending' | 'confirming' | 'success' | 'error' |
            'waitingForApprovalSignature' | 'approving' | 'approvalSuccess' | 'approvalError' |
            'backendProcessing' | 'backendSuccess' | 'backendError';
  transactionHash?: Hex;
  errorMessage?: string | null;
  explorerUrl?: string;
  backendMessage?: string | null;
  requestId?: string;
}

export function TransactionStatusModal({
  isOpen,
  onClose,
  txStatus,
  transactionHash,
  errorMessage,
  explorerUrl = "https://basescan.org",
  backendMessage,
  requestId
}: TransactionStatusModalProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedRequestId, setCopiedRequestId] = useState(false);

  const isPendingBlockchain = txStatus === 'waitingForSignature' || txStatus === 'sending' || txStatus === 'confirming';
  const isSuccessBlockchainConfirmed = txStatus === 'success';
  const isErrorBlockchain = txStatus === 'error';
  const isBackendProcessing = txStatus === 'backendProcessing';
  const isBackendSuccess = txStatus === 'backendSuccess';
  const isBackendError = txStatus === 'backendError';
  const isWaitingForApprovalSignature = txStatus === 'waitingForApprovalSignature';
  const isApproving = txStatus === 'approving';
  const isApprovalSuccess = txStatus === 'approvalSuccess';
  const isApprovalError = txStatus === 'approvalError';

  // Show copy buttons for failed states or when transaction is completed
  const showCopyButtons = isErrorBlockchain || isBackendError || isApprovalError || isBackendSuccess;

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
  } else if (txStatus === 'waitingForSignature') {
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
    description = backendMessage || errorMessage || "The payment could not be completed by the service provider. Contact support with your transaction hash.";
    icon = <XCircle className="w-12 h-12 text-red-600" />;
    iconColor = "text-red-600";
  }

  const explorerLink = transactionHash ? `${explorerUrl}/tx/${transactionHash}` : '#';

  const copyToClipboard = async (text: string, type: 'hash' | 'requestId') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'hash') {
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
      } else {
        setCopiedRequestId(true);
        setTimeout(() => setCopiedRequestId(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const printReceipt = () => {
    const content = document.getElementById("printable-receipt");
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Transaction Receipt</title></head><body>${content.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-6 text-center">
        <DialogHeader className="flex flex-col items-center">
          <div className={`mb-4 ${iconColor}`}>{icon}</div>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground mt-2">{description}</DialogDescription>
        </DialogHeader>

        {transactionHash && (
          <div className="mt-4 text-sm break-words">
            <p className="font-medium">Transaction Hash:</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Link href={explorerLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {transactionHash.substring(0, 6)}...{transactionHash.substring(transactionHash.length - 4)}
              </Link>
              {showCopyButtons && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(transactionHash, 'hash')}
                >
                  {copiedHash ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
        {requestId && (txStatus !== 'idle' && txStatus !== 'waitingForSignature' && !isWaitingForApprovalSignature) && (
          <div className="mt-4 text-sm break-words">
            <p className="font-medium">Request ID:</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-muted-foreground font-mono text-xs">{requestId}</span>
              {showCopyButtons && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(requestId, 'requestId')}
                >
                  {copiedRequestId ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        <div id="printable-receipt" style={{ display: 'none' }}>
          <h2 style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Transaction Receipt</h2>
          <p><strong>Status:</strong> {txStatus}</p>
          <p><strong>Request ID:</strong> {requestId}</p>
          <p><strong>Transaction Hash:</strong> {transactionHash}</p>
          <p><strong>Explorer:</strong> {explorerLink}</p>
          <p><strong>Message:</strong> {backendMessage || errorMessage || "N/A"}</p>
        </div>

        <DialogFooter className="mt-6 flex justify-center gap-4">
          {isBackendSuccess && (
            <Button variant="secondary" onClick={printReceipt}>
              <Printer className="w-4 h-4 mr-2" /> Print Receipt
            </Button>
          )}
          <Button onClick={onClose}>
            {isBackendSuccess || isBackendError || isErrorBlockchain || isApprovalError ? "Done" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}