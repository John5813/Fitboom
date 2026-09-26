/**
 * Ilovadagi xatolarni serverga yuboradi.
 *
 * Ilgari client xatolari faqat brauzer konsolida qolardi — mijoz muammoga
 * tushsa, jamoa buni bilmasdi.
 */

/** Bir xil xatoni qayta-qayta yubormaslik uchun */
const reported = new Set<string>();
const MAX_REPORTS_PER_SESSION = 15;
let reportCount = 0;

export function reportError(message: string, stack?: string, context?: string): void {
  if (reportCount >= MAX_REPORTS_PER_SESSION) return;

  const key = `${message}|${(stack || '').split('\n')[1] || ''}`;
  if (reported.has(key)) return;
  reported.add(key);
  reportCount++;

  // `keepalive` — sahifa yopilayotganda ham yuborilishi uchun
  fetch('/api/client-errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    keepalive: true,
    body: JSON.stringify({
      message: String(message).slice(0, 500),
      stack: stack ? String(stack).slice(0, 4000) : undefined,
      context: context ?? `${location.pathname}${location.search}`,
    }),
  }).catch(() => {
    // Xato hisobotini yuborib bo'lmasa — jim o'tkazamiz, aks holda halqa hosil bo'ladi
  });
}

/** Global xato ushlagichlarini o'rnatadi */
export function installErrorReporting(): void {
  window.addEventListener('error', (event) => {
    // Rasm/skript yuklanmasligi — bu JS xatosi emas, o'tkazib yuboramiz
    if (!event.error && !event.message) return;
    reportError(event.message || 'Unknown error', event.error?.stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason: any = event.reason;
    reportError(
      `Unhandled promise rejection: ${reason?.message ?? String(reason)}`,
      reason?.stack,
    );
  });
}
