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
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-50 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      <div className="flex items-end justify-around px-1 pb-2 pt-1 relative">
        {leftTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-0 flex-1"
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon
                className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className={`text-[10px] font-medium transition-colors leading-tight text-center ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => onTabChange('scanner')}
          className="flex flex-col items-center gap-0.5 -mt-4 flex-1"
          data-testid="tab-scanner"
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-background transition-colors ${
              activeTab === 'scanner'
                ? 'bg-primary'
                : 'bg-gray-900 dark:bg-gray-100'
            }`}
          >
            <QrCode
              className={`w-6 h-6 ${activeTab === 'scanner' ? 'text-primary-foreground' : 'text-white dark:text-gray-900'}`}
              strokeWidth={2}
            />
          </div>
          <span className={`text-[10px] font-medium leading-tight mt-0.5 ${activeTab === 'scanner' ? 'text-primary' : 'text-muted-foreground'}`}>
            {t('nav.scanner')}
          </span>
        </button>

        {rightTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-0 flex-1"
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon
                className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className={`text-[10px] font-medium transition-colors leading-tight text-center ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
