// components/TransactionReceiptModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Printer } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

interface ReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    requestId: string;
    userAddress: string;
    transactionHash: string;
    serviceType: string;
    serviceID: string;
    variationCode?: string;
    customerIdentifier: string;
    amountNaira: number;
    cryptoUsed: number;
    cryptoSymbol: string;
    chainName: string;
    onChainStatus: string;
    vtpassStatus: string;
    createdAt: string;
    Token: number;
    // Backend stores these as separate fields
    prepaid_token?: string;
    units?: string;
    kct1?: string;
    kct2?: string;
    // Legacy support for nested structure
    vtpassResponse?: {
      token?: string;
      units?: string;
      kct1?: string;
      kct2?: string;
    };
  } | null;
}

export function TransactionReceiptModal({ isOpen, onClose, order }: ReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Check if transaction is complete
  const isTransactionComplete = order && 
    (order.onChainStatus === 'success' || order.onChainStatus === 'confirmed') && 
    (order.vtpassStatus === 'success' || order.vtpassStatus === 'delivered' || order.vtpassStatus === 'successful');

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const printWindow = window.open("", "", "height=600,width=800");
      if (printWindow) {
        printWindow.document.write("<html><head><title>Print Receipt</title></head><body>");
        printWindow.document.write(printContents);
        printWindow.document.write("</body></html>");
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={isTransactionComplete ? onClose : undefined}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Transaction Receipt</DialogTitle>
        </DialogHeader>

        {order && (
          <div ref={printRef} className="space-y-2 text-sm">
            <div className="border rounded-md p-4">
              <p><strong>Request ID:</strong> {order.requestId}</p>
              <p><strong>Wallet Address:</strong> {order.userAddress}</p>
              <p><strong>Chain:</strong> {order.chainName}</p>
              <p><strong>Service:</strong> {order.serviceType.toUpperCase()} - {order.serviceID}</p>
              {order.variationCode && <p><strong>Plan Code:</strong> {order.variationCode}</p>}
              <p><strong>Customer Identifier:</strong> {order.customerIdentifier}</p>
              <p><strong>Amount (NGN):</strong> ₦{order.amountNaira.toLocaleString()}</p>
              <p><strong>Paid:</strong> {order.cryptoUsed} {order.cryptoSymbol}</p>
              <p><strong>Blockchain Status:</strong> {order.onChainStatus}</p>
              <p><strong>Service Status:</strong> {order.vtpassStatus}</p>
              <p><strong>Txn Hash:</strong> <span className="break-all">{order.transactionHash}</span></p>
              <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
              
              {/* Prepaid Token Information */}
              {order && (order.prepaid_token || order.units || (order.vtpassResponse && (order.vtpassResponse.token || order.vtpassResponse.units))) && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <p className="font-semibold text-green-800 dark:text-green-200 mb-2">Prepaid Meter Information</p>
                  {(order.prepaid_token || order.vtpassResponse?.token) && (
                    <p className="text-green-700 dark:text-green-300">
                      <strong>Token:</strong> <span className="font-mono bg-green-100 dark:bg-green-900/40 px-1 rounded">{order.prepaid_token || order.vtpassResponse?.token}</span>
                    </p>
                  )}
                  {(order.units || order.vtpassResponse?.units) && (
                    <p className="text-green-700 dark:text-green-300">
                      <strong>Units:</strong> {order.units || order.vtpassResponse?.units}
                    </p>
                  )}
                  {(order.kct1 || order.vtpassResponse?.kct1) && (
                    <p className="text-green-700 dark:text-green-300 text-xs">
                      <strong>KCT1:</strong> <span className="font-mono">{order.kct1 || order.vtpassResponse?.kct1}</span>
                    </p>
                  )}
                  {(order.kct2 || order.vtpassResponse?.kct2) && (
                    <p className="text-green-700 dark:text-green-300 text-xs">
                      <strong>KCT2:</strong> <span className="font-mono">{order.kct2 || order.vtpassResponse?.kct2}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => copyToClipboard(order?.transactionHash || "")}> 
            <Copy className="w-4 h-4 mr-2" /> Copy Hash
          </Button>
          {(order?.prepaid_token || order?.vtpassResponse?.token) && (
            <Button variant="outline" onClick={() => copyToClipboard(order?.prepaid_token || order?.vtpassResponse?.token || "")}> 
              <Copy className="w-4 h-4 mr-2" /> Copy Token
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print Receipt
          </Button>
          {isTransactionComplete && (
            <Button onClick={onClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
