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
    onChainStatus: string;
    vtpassStatus: string;
    createdAt: string;
  } | null;
}

export function TransactionReceiptModal({ isOpen, onClose, order }: ReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Transaction Receipt</DialogTitle>
        </DialogHeader>

        {order && (
          <div ref={printRef} className="space-y-2 text-sm">
            <div className="border rounded-md p-4">
              <p><strong>Request ID:</strong> {order.requestId}</p>
              <p><strong>Wallet Address:</strong> {order.userAddress}</p>
              <p><strong>Service:</strong> {order.serviceType.toUpperCase()} - {order.serviceID}</p>
              {order.variationCode && <p><strong>Plan Code:</strong> {order.variationCode}</p>}
              <p><strong>Customer Identifier:</strong> {order.customerIdentifier}</p>
              <p><strong>Amount (NGN):</strong> ₦{order.amountNaira.toLocaleString()}</p>
              <p><strong>Paid:</strong> {order.cryptoUsed} {order.cryptoSymbol}</p>
              <p><strong>Blockchain Status:</strong> {order.onChainStatus}</p>
              <p><strong>Service Status:</strong> {order.vtpassStatus}</p>
              <p><strong>Txn Hash:</strong> <span className="break-all">{order.transactionHash}</span></p>
              <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => copyToClipboard(order?.transactionHash || "")}> 
            <Copy className="w-4 h-4 mr-2" /> Copy Hash
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print Receipt
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
