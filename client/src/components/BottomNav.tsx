import { Home, Dumbbell, Video, Calendar, QrCode } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onScanQR: () => void;
}

export default function BottomNav({ activeTab, onTabChange, onScanQR }: BottomNavProps) {
  const { t } = useLanguage();
  const leftTabs = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'gyms', label: t('nav.gyms'), icon: Dumbbell },
  ];
  const rightTabs = [
    { id: 'classes', label: t('nav.classes'), icon: Video },
    { id: 'bookings', label: t('nav.bookings'), icon: Calendar },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50">
      <div className="flex items-center justify-around px-2 py-2 relative">
        {leftTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-colors hover-elevate ${
              activeTab === tab.id 
                ? 'text-primary' 
                : 'text-muted-foreground'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}

        <button
          onClick={() => onTabChange('scanner')}
          className="flex flex-col items-center gap-1 -mt-5"
          data-testid="tab-scanner"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
            activeTab === 'scanner'
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/90 text-primary-foreground'
          }`}>
            <QrCode className="w-7 h-7" />
          </div>
          <span className={`text-xs ${activeTab === 'scanner' ? 'text-primary' : 'text-muted-foreground'}`}>
            {t('nav.scanner')}
          </span>
        </button>

        {rightTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-colors hover-elevate ${
              activeTab === tab.id 
                ? 'text-primary' 
                : 'text-muted-foreground'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
