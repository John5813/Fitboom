import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ACCESS_PASS_STORAGE_KEY,
  isPassActive,
  parseStoredPass,
  type AccessPass,
} from "@shared/accessPass";
import { useAuth } from "@/contexts/AuthContext";
import AccessPassOverlay from "@/components/AccessPassOverlay";
import AccessPassBubble from "@/components/AccessPassBubble";

/*
 * Zalga kirish ruxsatnomasi (qoidalar: shared/accessPass.ts).
 * Vebdagi client/src/contexts/AccessPassContext.tsx bilan bir xil ishlaydi:
 * QR tasdiqlangach to'liq ekran ruxsatnoma, yopilsa 1 soat davomida
 * ekran burchagida bulutcha — bosilsa qayta ochiladi.
 */

interface AccessPassContextValue {
  pass: AccessPass | null;
  isOpen: boolean;
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

export async function clearStoredAccessPass() {
  try {
    await AsyncStorage.removeItem(ACCESS_PASS_STORAGE_KEY);
  } catch {
    /* muhim emas */
  }
}

export function AccessPassProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pass, setPass] = useState<AccessPass | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Ilova qayta ochilganda saqlangan ruxsatnomani tiklash
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ACCESS_PASS_STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        const stored = parseStoredPass(raw, Date.now());
        if (stored) setPass(stored);
        else if (raw) clearStoredAccessPass();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const clear = useCallback(() => {
    clearStoredAccessPass();
    setPass(null);
    setIsOpen(false);
  }, []);

  // Muddati tugaganda o'zi yo'qoladi
  useEffect(() => {
    if (!pass) return;
    const id = setInterval(() => {
      if (!isPassActive(pass, Date.now())) clear();
    }, 1000);
    return () => clearInterval(id);
  }, [pass, clear]);

  const show = useCallback((next: AccessPass) => {
    AsyncStorage.setItem(ACCESS_PASS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
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

  // Faqat tizimga kirgan mijozga
  const visible = !!user && !!pass;

  return (
    <AccessPassContext.Provider value={value}>
      {children}
      {visible && !isOpen && <AccessPassBubble pass={pass!} onOpen={() => setIsOpen(true)} />}
      {visible && <AccessPassOverlay pass={pass!} visible={isOpen} onClose={() => setIsOpen(false)} />}
    </AccessPassContext.Provider>
  );
}

export function useAccessPass() {
  return useContext(AccessPassContext);
}
