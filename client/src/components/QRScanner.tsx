import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Scanner } from '@yudiel/react-qr-scanner';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  isDialog?: boolean;
  gymId?: string;
}

const FRAME = 260;

export default function QRScanner({ isOpen, onClose, onScan, isDialog = true }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = (detectedCodes: any) => {
    if (detectedCodes && detectedCodes.length > 0 && !hasScanned) {
      setHasScanned(true);
      const qrText = detectedCodes[0].rawValue;
      try {
        JSON.parse(qrText);
        onScan(qrText);
        if (isDialog) onClose();
        setHasScanned(false);
      } catch {
        setError("QR kod formati noto'g'ri. To'g'ri QR kodni skanerlang.");
        setTimeout(() => { setHasScanned(false); setError(null); }, 2000);
      }
    }
  };

  const handleError = () => {
    setError("Kamera ochishda xatolik. Iltimos, kamera ruxsatini tekshiring.");
  };

  const content = (
    <div className="relative w-full h-full bg-black overflow-hidden" style={{ minHeight: '100dvh' }}>
      <style>{`
        @keyframes scanMove {
          0%   { top: 2px; opacity: 1; }
          48%  { opacity: 1; }
          50%  { top: calc(${FRAME}px - 4px); opacity: 0.4; }
          52%  { opacity: 1; }
          100% { top: 2px; }
        }
        .qr-scan-line {
          position: absolute;
          left: 4px;
          right: 4px;
          height: 2px;
          border-radius: 2px;
          background: linear-gradient(90deg, transparent, white, transparent);
          box-shadow: 0 0 8px 2px rgba(255,255,255,0.7);
          animation: scanMove 2s ease-in-out infinite;
        }
      `}</style>

      {!error && (
        <Scanner
          onScan={handleScan}
          onError={handleError}
          constraints={{ facingMode: 'environment' }}
          styles={{
            container: {
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
            },
            video: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          }}
        />
      )}

      {!error && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 bg-black/55" style={{ height: `calc(50% - ${FRAME / 2}px)` }} />
          <div className="absolute bottom-0 left-0 right-0 bg-black/55" style={{ height: `calc(50% - ${FRAME / 2}px)` }} />
          <div
            className="absolute left-0 bg-black/55"
            style={{
              top: `calc(50% - ${FRAME / 2}px)`,
              bottom: `calc(50% - ${FRAME / 2}px)`,
              width: `calc(50% - ${FRAME / 2}px)`,
            }}
          />
          <div
            className="absolute right-0 bg-black/55"
            style={{
              top: `calc(50% - ${FRAME / 2}px)`,
              bottom: `calc(50% - ${FRAME / 2}px)`,
              width: `calc(50% - ${FRAME / 2}px)`,
            }}
          />

          <div
            className="absolute"
            style={{
              width: FRAME,
              height: FRAME,
              top: `calc(50% - ${FRAME / 2}px)`,
              left: `calc(50% - ${FRAME / 2}px)`,
            }}
          >
            <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-white rounded-tl-md" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-white rounded-tr-md" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-white rounded-bl-md" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-white rounded-br-md" />

            <div className="qr-scan-line" />
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        className="absolute top-10 left-4 z-20 flex items-center gap-2 text-white"
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
      >
        <div className="p-2 rounded-full bg-black/40 backdrop-blur-sm">
          <ArrowLeft className="w-5 h-5" />
        </div>
      </button>

      <div className="absolute top-10 left-0 right-0 flex justify-center z-20 pointer-events-none">
        <p className="text-white text-sm font-semibold tracking-wide px-5 py-2 rounded-full bg-black/40 backdrop-blur-sm">
          QR-kodni ramka ichiga joylang
        </p>
      </div>

      <div
        className="absolute left-0 right-0 flex justify-center z-20 pointer-events-none"
        style={{ top: `calc(50% + ${FRAME / 2}px + 20px)` }}
      >
        <p className="text-white/70 text-xs text-center px-8">
          QR kod avtomatik taniladi
        </p>
      </div>

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 px-8">
          <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
          <p className="text-white text-center text-sm mb-6">{error}</p>
          <Button
            onClick={() => { setError(null); setHasScanned(false); }}
            variant="outline"
            className="text-white border-white/50 bg-white/10 hover:bg-white/20"
          >
            Qayta urinish
          </Button>
        </div>
      )}
    </div>
  );

  if (!isDialog) {
    return isOpen ? content : null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="p-0 border-0 bg-black overflow-hidden rounded-none [&>button]:hidden"
        style={{
          width: '100vw',
          height: '100dvh',
          maxWidth: '100vw',
          maxHeight: '100dvh',
          margin: 0,
          borderRadius: 0,
        }}
      >
        {content}
      </DialogContent>
    </Dialog>
  );
}
