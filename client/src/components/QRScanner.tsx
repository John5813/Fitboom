import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import { useState } from "react";

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  isDialog?: boolean;
}

export default function QRScanner({ isOpen, onClose, onScan, isDialog = true }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      onScan('gym-checkin-12345');
      setIsScanning(false);
      if (isDialog) {
        onClose();
      }
    }, 1500);
  };

  const scannerContent = (
    <div className="py-8">
      <div className="relative aspect-square bg-muted rounded-md flex items-center justify-center max-w-md mx-auto">
        {isScanning ? (
          <div className="text-center">
            <div className="animate-pulse mb-4">
              <QrCode className="w-24 h-24 mx-auto text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Skanerlash...</p>
          </div>
        ) : (
          <div className="text-center p-6">
            <QrCode className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
            <p className="text-sm text-muted-foreground mb-6">
              QR kodni skanerlash uchun kamera yoqiladi
            </p>
            <Button 
              onClick={handleSimulateScan}
              size="lg"
              className="bg-orange-500 hover:bg-orange-600"
              data-testid="button-simulate-scan"
            >
              Skanerlashni boshlash
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (!isDialog) {
    return isOpen ? scannerContent : null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR kodni skanerlash</DialogTitle>
        </DialogHeader>
        {scannerContent}
      </DialogContent>
    </Dialog>
  );
}
