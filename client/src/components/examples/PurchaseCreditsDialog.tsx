import PurchaseCreditsDialog from '../PurchaseCreditsDialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function PurchaseCreditsDialogExample() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open Dialog</Button>
      <PurchaseCreditsDialog 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onPurchase={(credits, price) => {
          console.log('Purchase:', credits, 'credits for', price);
          setIsOpen(false);
        }}
      />
    </div>
  );
}
