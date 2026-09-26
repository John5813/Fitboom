import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPaymentStatus } from "@/services/api";

const STORAGE_KEY = "fitboom_dismissed_partial_ids";
const MAX_STORED = 30;

interface PartialPayment {
  id: string;
  remainingAmount: number;
  credits: number;
}

export function usePartialPaymentDismiss(
  activePartialPayment: PartialPayment | null | undefined
) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const ids: string[] = JSON.parse(raw);
            setDismissedIds(new Set(ids));
          } catch {}
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const dismissPayment = useCallback(async (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(id)) {
        const updated = [...ids, id].slice(-MAX_STORED);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!activePartialPayment?.id || !loaded) return;
    if (dismissedIds.has(activePartialPayment.id)) return;

    getPaymentStatus(activePartialPayment.id)
      .then((res) => {
        if (res.status !== "partial") {
          dismissPayment(activePartialPayment.id);
        }
      })
      .catch(() => {});
  }, [activePartialPayment?.id, loaded]);

  const isVisible =
    loaded &&
    !!activePartialPayment &&
    activePartialPayment.remainingAmount > 0 &&
    !dismissedIds.has(activePartialPayment.id);

  return { isVisible, dismissPayment };
}
