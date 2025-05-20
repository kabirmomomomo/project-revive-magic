import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { discoverPrinters, checkPrinterStatus } from '@/services/printerDiscoveryService';

interface PrinterSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: { ip: string; port: number; paperWidth: number }) => void;
  initialConfig?: { ip: string; port: number; paperWidth: number };
}

const PrinterSettings: React.FC<PrinterSettingsProps> = ({
  open,
  onOpenChange,
  onSave,
  initialConfig,
}) => {
  const [ip, setIp] = useState(initialConfig?.ip || '');
  const [port, setPort] = useState(initialConfig?.port?.toString() || '9100');
  const [paperWidth, setPaperWidth] = useState(initialConfig?.paperWidth?.toString() || '58');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<Array<{ ip: string; port: number; status: string }>>([]);

  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      const printers = await discoverPrinters();
      setDiscoveredPrinters(printers);
      if (printers.length === 0) {
        toast.info('No printers found on the network');
      }
    } catch (error) {
      toast.error('Failed to discover printers');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handlePrinterSelect = async (printer: { ip: string; port: number }) => {
    const isOnline = await checkPrinterStatus(printer.ip, printer.port);
    if (isOnline) {
      setIp(printer.ip);
      setPort(printer.port.toString());
      toast.success('Printer selected');
    } else {
      toast.error('Selected printer is offline');
    }
  };

  const handleSave = () => {
    // Validate IP address
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      toast.error('Please enter a valid IP address');
      return;
    }

    // Validate port
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      toast.error('Please enter a valid port number (1-65535)');
      return;
    }

    // Validate paper width
    const widthNum = parseInt(paperWidth);
    if (isNaN(widthNum) || widthNum < 1) {
      toast.error('Please enter a valid paper width');
      return;
    }

    onSave({
      ip,
      port: portNum,
      paperWidth: widthNum,
    });
    onOpenChange(false);
    toast.success('Printer settings saved');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Printer Settings
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDiscover}
              disabled={isDiscovering}
              className="flex-1"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Discovering...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Discover Printers
                </>
              )}
            </Button>
          </div>

          {discoveredPrinters.length > 0 && (
            <div className="border rounded-md p-2 max-h-[200px] overflow-y-auto">
              <Label className="text-sm text-gray-500 mb-2">Discovered Printers</Label>
              <div className="space-y-2">
                {discoveredPrinters.map((printer, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                    onClick={() => handlePrinterSelect(printer)}
                  >
                    <div>
                      <div className="font-medium">{printer.ip}</div>
                      <div className="text-sm text-gray-500">Port: {printer.port}</div>
                    </div>
                    <div className={`h-2 w-2 rounded-full ${printer.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="ip">Printer IP Address</Label>
            <Input
              id="ip"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.1.100"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="9100"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paperWidth">Paper Width (mm)</Label>
            <Input
              id="paperWidth"
              type="number"
              value={paperWidth}
              onChange={(e) => setPaperWidth(e.target.value)}
              placeholder="58"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrinterSettings; 