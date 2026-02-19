import { useState, useEffect, useRef } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

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
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          localStorage.setItem("fitboom-app-installed", "true");
          setShowBanner(false);
        }
      } catch (e) {
        console.log("Install prompt error:", e);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("fitboom-install-dismissed", Date.now().toString());
  };

  if (showIOSGuide) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
        onClick={handleDismiss}
        data-testid="ios-install-guide"
      >
        <div
          className="bg-card border-t rounded-t-lg p-5 w-full max-w-md animate-in slide-in-from-bottom-5 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base">Ilovani o'rnatish</h3>
            <Button size="icon" variant="ghost" onClick={handleDismiss} data-testid="button-close-ios-guide">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {isIOS ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Safari brauzerida oching</p>
                  <p className="text-xs text-muted-foreground">Bu sahifani Safari da oching</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</div>
                <div className="flex-1 flex items-center gap-2">
                  <div>
                    <p className="text-sm font-medium">Ulashish tugmasini bosing</p>
                    <p className="text-xs text-muted-foreground">Pastdagi <Share className="w-3 h-3 inline" /> belgisini bosing</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">"Bosh ekranga qo'shish" ni tanlang</p>
                  <p className="text-xs text-muted-foreground">Pastga suring va "Add to Home Screen" bosing</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Chrome brauzerida oching</p>
                  <p className="text-xs text-muted-foreground">Bu sahifani Chrome da oching</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Menyuni oching</p>
                  <p className="text-xs text-muted-foreground">Yuqori o'ngdagi 3 nuqtani bosing</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">"Ilovani o'rnatish" ni tanlang</p>
                  <p className="text-xs text-muted-foreground">"Install app" yoki "Add to Home screen" bosing</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
