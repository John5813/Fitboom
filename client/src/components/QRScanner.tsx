import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, AlertCircle } from "lucide-react";
import { useState } from "react";
import QrScanner from 'react-qr-scanner';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  isDialog?: boolean;
  gymId?: string; // Qaysi zal uchun skanerlayotganini bilish uchun
}

export default function QRScanner({ isOpen, onClose, onScan, isDialog = true, gymId }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (data: any) => {
    if (data) {
      const qrText = data.text || data;
      
      // Agar gymId berilgan bo'lsa, QR koddan olingan ma'lumotda gymId borligini tekshiramiz
      if (gymId) {
        try {
          const scannedData = JSON.parse(qrText);
          if (scannedData.gymId === gymId) {
            onScan(qrText);
            if (isDialog) {
              onClose();
            }
          } else {
            setError("Bu QR kod ushbu zal uchun emas.");
          }
        } catch (e) {
          console.error('QR parse error:', e);
          setError("QR kod formati noto'g'ri. Iltimos, to'g'ri QR kodni skanerlang.");
        }
      } else {
        // Agar gymId berilmagan bo'lsa, JSON formatni tekshiramiz
        try {
          JSON.parse(qrText);
          onScan(qrText);
          if (isDialog) {
            onClose();
          }
        } catch (e) {
          setError("QR kod formati noto'g'ri. Iltimos, to'g'ri QR kodni skanerlang.");
        }
      }
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    setError("Kamera ochishda xatolik yuz berdi. Iltimos, kamera ruxsatini tekshiring.");
  };

  const scannerContent = (
    <div className="py-4">
      <div className="relative aspect-square bg-muted rounded-md overflow-hidden max-w-md mx-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button
              onClick={() => {
                setError(null);
              }}
              variant="outline"
            >
              Qayta urinish
            </Button>
          </div>
        ) : (
          <>
            <QrScanner
              delay={300}
              onError={handleError}
              onScan={handleScan}
              style={{ width: '100%' }}
              constraints={{
                video: { facingMode: 'environment' }
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
        </DialogHeader>
        {scannerContent}
      </DialogContent>
    </Dialog>
  );
}