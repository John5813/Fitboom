import { createContext, useContext, useEffect, useState } from "react";

type Language = "uz" | "ru" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  uz: {
    "app.name": "FitBoom",
    "home.welcome": "Sport hayotingizni boshqaring",
    "home.near_gyms": "Sizga eng yaqin zallar",
    "home.view_all": "Barchasini ko'rish",
    "settings.title": "Sozlamalar",
    "settings.admin": "Admin sifatida kirish",
    "settings.gym_owner": "Zal egasi sifatida kirish",
    "settings.partner": "Hamkor bo'lish",
    "nav.home": "Asosiy",
    "nav.gyms": "Zallar",
    "nav.classes": "Darslar",
    "nav.bookings": "Bronlar",
    "common.back": "Orqaga",
    "common.save": "Saqlash",
    "common.cancel": "Bekor qilish"
  },
  ru: {
    "app.name": "FitBoom",
    "home.welcome": "Управляйте своей спортивной жизнью",
    "home.near_gyms": "Ближайшие залы",
    "home.view_all": "Посмотреть все",
    "settings.title": "Настройки",
    "settings.admin": "Войти как админ",
    "settings.gym_owner": "Войти как владелец зала",
    "settings.partner": "Стать партнером",
    "nav.home": "Главная",
    "nav.gyms": "Залы",
    "nav.classes": "Занятия",
    "nav.bookings": "Брони",
    "common.back": "Назад",
    "common.save": "Сохранить",
    "common.cancel": "Отмена"
  },
  en: {
    "app.name": "FitBoom",
    "home.welcome": "Manage your sports life",
    "home.near_gyms": "Gyms near you",
    "home.view_all": "View all",
    "settings.title": "Settings",
    "settings.admin": "Login as Admin",
    "settings.gym_owner": "Login as Gym Owner",
    "settings.partner": "Become a Partner",
    "nav.home": "Home",
    "nav.gyms": "Gyms",
    "nav.classes": "Classes",
    "nav.bookings": "Bookings",
    "common.back": "Back",
    "common.save": "Save",
    "common.cancel": "Cancel"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    (localStorage.getItem("language") as Language) || "uz"
  );

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
