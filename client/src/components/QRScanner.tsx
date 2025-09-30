import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, X } from "lucide-react";
import { useState } from "react";

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export default function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      onScan('gym-checkin-12345');
      setIsScanning(false);
      onClose();
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR kodni skanerlash</DialogTitle>
        </DialogHeader>
        <div className="py-8">
          <div className="relative aspect-square bg-muted rounded-md flex items-center justify-center">
            {isScanning ? (
              <div className="text-center">
                <div className="animate-pulse mb-4">
                  <QrCode className="w-16 h-16 mx-auto text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Skanerlash...</p>
              </div>
            ) : (
              <div className="text-center">
                <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  QR kodni skanerlash uchun kamera yoqiladi
                </p>
                <Button 
                  onClick={handleSimulateScan}
                  data-testid="button-simulate-scan"
                >
                  Skanerlashni boshlash
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
