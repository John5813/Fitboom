import QRScanner from '../QRScanner';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function QRScannerExample() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open Scanner</Button>
      <QRScanner 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onScan={(data) => console.log('Scanned:', data)}
      />
    </div>
  );
}
