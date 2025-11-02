import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { Scanner } from '@yudiel/react-qr-scanner';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  isDialog?: boolean;
  gymId?: string;
}

export default function QRScanner({ isOpen, onClose, onScan, isDialog = true, gymId }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = (detectedCodes: any) => {
    if (detectedCodes && detectedCodes.length > 0 && !hasScanned) {
      setHasScanned(true);
      const qrText = detectedCodes[0].rawValue;

      console.log('QR scanned:', qrText);

      if (gymId) {
        try {
          const scannedData = JSON.parse(qrText);
          console.log('Parsed QR data:', scannedData);

          if (scannedData.gymId === gymId) {
            onScan(qrText);
            if (isDialog) {
              onClose();
            }
            setHasScanned(false);
          } else {
            setError("Bu QR kod ushbu zal uchun emas.");
            setTimeout(() => {
              setHasScanned(false);
              setError(null);
            }, 2000);
          }
        } catch (e) {
          console.error('QR parse error:', e);
          setError("QR kod formati noto'g'ri. Iltimos, to'g'ri QR kodni skanerlang.");
          setTimeout(() => {
            setHasScanned(false);
            setError(null);
          }, 2000);
        }
      } else {
        try {
          JSON.parse(qrText);
          onScan(qrText);
          if (isDialog) {
            onClose();
          }
          setHasScanned(false);
        } catch (e) {
          console.error('QR parse error:', e);
          setError("QR kod formati noto'g'ri. Iltimos, to'g'ri QR kodni skanerlang.");
          setTimeout(() => {
            setHasScanned(false);
            setError(null);
          }, 2000);
        }
      }
    }
  };

  const handleError = (err: any) => {
    console.error('QR Scanner error:', err);
    setError("Kamera ochishda xatolik yuz berdi. Iltimos, kamera ruxsatini tekshiring.");
  };

  const resetScanner = () => {
    setError(null);
    setHasScanned(false);
  };

  const scannerContent = (
    <div className="py-4">
      <div className="relative aspect-square bg-muted rounded-md overflow-hidden max-w-md mx-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button
              onClick={resetScanner}
              variant="outline"
            >
              Qayta urinish
            </Button>
          </div>
        ) : (
          <>
            <Scanner
              onScan={handleScan}
              onError={handleError}
              constraints={{
                facingMode: 'environment'
              }}
              styles={{
                container: {
                  width: '100%',
                  height: '100%'
                }
              }}
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-2 border-primary/50 m-12 rounded-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
              </div>
            </div>
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-sm text-white bg-black/50 inline-block px-4 py-2 rounded-full">
                QR kodni ramka ichiga joylashtiring
              </p>
            </div>
          </>
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
          <DialogDescription>
            QR kodni kamera oldiga joylashtiring va tasdiqlash uchun kuting
          </DialogDescription>
        </DialogHeader>
        {scannerContent}
      </DialogContent>
    </Dialog>
  );
}