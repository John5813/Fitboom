import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ACCESS_PASS_STORAGE_KEY,
  isPassActive,
  parseStoredPass,
  type AccessPass,
} from "@shared/accessPass";
import AccessPassOverlay from "@/components/AccessPassOverlay";
import AccessPassBubble from "@/components/AccessPassBubble";
import { useAuth } from "@/contexts/AuthContext";

/*
 * Zalga kirish ruxsatnomasi (qoidalar: shared/accessPass.ts).
 *
 * QR tasdiqlangach ruxsatnoma to'liq ekranda ochiladi. Mijoz uni yopsa,
 * 1 soat davomida ekran burchagida "bulutcha" turadi — bosilsa qayta ochiladi.
 * Ilovada ham xuddi shunday (mobile/contexts/AccessPassContext.tsx).
 */

interface AccessPassContextValue {
  pass: AccessPass | null;
  isOpen: boolean;
  /** Yangi ruxsatnomani saqlaydi va darhol ochadi */
  show: (pass: AccessPass) => void;
  open: () => void;
  close: () => void;
  clear: () => void;
}

const AccessPassContext = createContext<AccessPassContextValue>({
  pass: null,
  isOpen: false,
  show: () => {},
  open: () => {},
  close: () => {},
  clear: () => {},
});

function readStored(): AccessPass | null {
  try {
    const pass = parseStoredPass(localStorage.getItem(ACCESS_PASS_STORAGE_KEY), Date.now());
    if (!pass) localStorage.removeItem(ACCESS_PASS_STORAGE_KEY);
    return pass;
  } catch {
    return null;
  }
}

export function clearStoredAccessPass() {
  try {
    localStorage.removeItem(ACCESS_PASS_STORAGE_KEY);
  } catch {
    /* saqlash imkoni yo'q — muhim emas */
  }
}

export function AccessPassProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [pass, setPass] = useState<AccessPass | null>(() => readStored());
  const [isOpen, setIsOpen] = useState(false);

  const clear = useCallback(() => {
    clearStoredAccessPass();
    setPass(null);
    setIsOpen(false);
  }, []);

  // Muddati tugaganda o'zi yo'qoladi
  useEffect(() => {
    if (!pass) return;
    const id = window.setInterval(() => {
      if (!isPassActive(pass, Date.now())) clear();
    }, 1000);
    return () => window.clearInterval(id);
  }, [pass, clear]);

  // Boshqa tabda ochilgan/yopilgan bo'lsa
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACCESS_PASS_STORAGE_KEY) setPass(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const show = useCallback((next: AccessPass) => {
    try {
      localStorage.setItem(ACCESS_PASS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private rejim — ruxsatnoma shu sessiyada baribir ishlaydi */
    }
    setPass(next);
    setIsOpen(true);
  }, []);

  const value = useMemo<AccessPassContextValue>(
    () => ({
      pass,
      isOpen,
      show,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      clear,
    }),
    [pass, isOpen, show, clear],
  );

  return (
    <AccessPassContext.Provider value={value}>
      {children}
      {/* Faqat tizimga kirgan mijozga — chiqqandan keyin boshqa odamga ko'rinmasin */}
      {isAuthenticated && pass && !isOpen && <AccessPassBubble pass={pass} onOpen={() => setIsOpen(true)} />}
      {isAuthenticated && pass && isOpen && <AccessPassOverlay pass={pass} onClose={() => setIsOpen(false)} />}
    </AccessPassContext.Provider>
  );
}

export function useAccessPass() {
  return useContext(AccessPassContext);
}
