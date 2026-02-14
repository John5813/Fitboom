import { useState, useEffect, useRef } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    const wasInstalled = localStorage.getItem("fitboom-app-installed");
    if (wasInstalled) return;

    const wasDismissed = localStorage.getItem("fitboom-install-dismissed");
    if (wasDismissed) {
      const dismissedAt = parseInt(wasDismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    const installedHandler = () => {
      localStorage.setItem("fitboom-app-installed", "true");
      setShowBanner(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    const timeout = setTimeout(() => {
      if (!promptRef.current) {
        const isMobileWeb =
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
          !isStandalone;

        if (isMobileWeb) {
          setShowBanner(true);
        }
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      clearTimeout(timeout);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        localStorage.setItem("fitboom-app-installed", "true");
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        alert(
          'Ilovani o\'rnatish uchun:\n\n1. Safari brauzerida oching\n2. Pastdagi "Ulashish" tugmasini bosing\n3. "Bosh ekranga qo\'shish" ni tanlang'
        );
      } else {
        alert(
          'Ilovani o\'rnatish uchun:\n\n1. Chrome brauzerida oching\n2. Menyuni oching (3 nuqta)\n3. "Ilovani o\'rnatish" ni tanlang'
        );
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    localStorage.setItem("fitboom-install-dismissed", Date.now().toString());
  };

  if (!showBanner || dismissed) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500"
      data-testid="install-prompt-banner"
    >
      <div className="bg-card border rounded-md p-4 flex items-center gap-3 shadow-lg">
        <div className="flex-shrink-0">
          <img
            src="/icon-192.png"
            alt="FitBoom"
            className="w-12 h-12 rounded-md"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">
            FitBoom ilovasini o'rnating
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tezroq kirish va qulay foydalanish uchun
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleInstall}
            data-testid="button-install-app"
          >
            <Download className="w-4 h-4 mr-1" />
            O'rnatish
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            data-testid="button-dismiss-install"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}