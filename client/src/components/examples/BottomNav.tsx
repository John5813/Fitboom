import BottomNav from '../BottomNav';
import { useState } from 'react';

export default function BottomNavExample() {
  const [activeTab, setActiveTab] = useState('home');
  
  return (
    <div className="h-32 relative">
      <BottomNav 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onScanQR={() => console.log('Scan QR')}
      />
    </div>
  );
}
