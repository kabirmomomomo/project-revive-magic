import React from "react";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, CheckCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";

interface QRCodeDialogProps {
  qrCodeValue: string;
}

const QRCodeDialog: React.FC<QRCodeDialogProps> = ({ qrCodeValue }) => {
  const [copied, setCopied] = useState(false);
  
  const copyUrl = () => {
    navigator.clipboard.writeText(qrCodeValue);
    setCopied(true);
    toast.success("QR code URL copied to clipboard");
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  
  // Get current session code from localStorage
  const sessionCode = localStorage.getItem("billSessionCode");
  const isSessionOwner = localStorage.getItem("billSessionOwner") === "true";
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-full hover:shadow-md transition-all">
          <QrCode className="h-4 w-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Menu QR Code</DialogTitle>
          <DialogDescription>
            Scan this code to view this restaurant menu
            {sessionCode && isSessionOwner && (
              <div className="mt-2 p-2 bg-purple-50 text-purple-700 rounded-md">
                Your bill phone: <span className="font-mono font-bold">{sessionCode}</span> 
                <span className="ml-1 text-xs">(Share with friends to join)</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <QRCode value={qrCodeValue} size={256} />
          </div>
          <div className="mt-4 text-sm text-muted-foreground max-w-full truncate flex items-center justify-between w-full">
            <span className="truncate">{qrCodeValue}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={copyUrl}
              className="ml-2 text-gray-500"
            >
              {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeDialog;
