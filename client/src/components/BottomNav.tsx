import { Home, Dumbbell, Video, Calendar, QrCode, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onScanQR: () => void;
}

export default function BottomNav({ activeTab, onTabChange, onScanQR }: BottomNavProps) {
  const { t } = useLanguage();
  const tabs = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'gyms', label: t('nav.gyms'), icon: Dumbbell },
    { id: 'classes', label: t('nav.classes'), icon: Video },
    { id: 'bookings', label: t('nav.bookings'), icon: Calendar },
    { id: 'scanner', label: t('nav.scanner'), icon: QrCode },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => (
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
