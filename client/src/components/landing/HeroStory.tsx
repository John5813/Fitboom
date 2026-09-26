import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import Wordmark from "@/components/brand/Wordmark";
import { CREDIT_PACKAGES, discountPercent } from "@shared/pricing";
import type { BarbellScene } from "./barbellScene";
import { beatOpacity, beatShift, clamp01, smoothstep } from "./storyTimeline";

/**
 * Kirish sahifasining 3D scroll hikoyasi.
 *
 * Tuzilishi: baland "yo'lak" (story-track) ichida ekran balandligidagi
 * yopishqoq (sticky) oyna. Foydalanuvchi pastga surgan sari oyna joyida
 * turadi, 3D shtanga esa holatdan holatga o'tadi:
 *   yig'ilgan → portlash → halqa → ustun → qayta yig'ilgan
 *
 * Har kadrda React qayta chizilmaydi — matnlar to'g'ridan-to'g'ri DOM
 * uslubi orqali yangilanadi, aks holda telefonda qotib qoladi.
 *
 * WebGL yo'q bo'lsa yoki three.js yuklanmasa — matnlar baribir almashadi,
 * faqat 3D o'rniga oltin nur foni qoladi.
 */

const maxDiscount = Math.max(...CREDIT_PACKAGES.map(discountPercent));

interface Beat {
  num: string;
  title: string;
  body: string;
}

const BEATS: Beat[] = [
  {
    num: "01",
    title: "Bitta zalga bog'lanib qolmang",
    body: "Gym, boks, suzish, yoga, velosiped, yugurish — bugun biri, ertaga boshqasi. Hisob bitta, tanlov sizda.",
  },
  {
    num: "02",
    title: "Hammasi bitta xaritada",
    body: "Yaqin zalni toping, bo'sh vaqtlarni ko'ring va bir bosishda bron qiling.",
  },
  {
    num: "03",
    title: "Pul emas — kredit",
    body: `Paket oling va istalgan hamkor zalda ishlating. Katta paket — ${maxDiscount}% gacha arzon.`,
  },
];

export default function HeroStory({ onStart }: { onStart: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beatRefs = useRef<Array<HTMLDivElement | null>>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [sceneState, setSceneState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    const track = trackRef.current;
    const sticky = stickyRef.current;
    const canvas = canvasRef.current;
    if (!track || !sticky || !canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowPower = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;

    let scene: BarbellScene | null = null;
    let disposed = false;
    let raf = 0;
    let inView = true;
    let target = 0;
    let current = 0;
    const start = performance.now();
    let last = start;

    const readProgress = () => {
      const rect = track.getBoundingClientRect();
      const total = rect.height - sticky.clientHeight;
      target = total > 0 ? clamp01(-rect.top / total) : 0;
    };

    const paintOverlays = (p: number) => {
      beatRefs.current.forEach((el, i) => {
        if (!el) return;
        const o = beatOpacity(p, i);
        const shift = reducedMotion ? 0 : beatShift(p, i) * 28;
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
        // Ko'rinmayotgan tugmalar bosilmasin va Tab bilan tanlanmasin
        el.inert = o < 0.5;
      });
      if (barRef.current) barRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
      if (hintRef.current) hintRef.current.style.opacity = (1 - smoothstep(0.005, 0.04, p)).toFixed(3);
    };

    const tick = (now: number) => {
      raf = 0;
      if (disposed) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      readProgress();
      // Scroll ortidan silliq yetib boradi — "sariyog'dek" his shundan.
      // Katta sakrashda (masalan, tepaga qaytish) tezroq yetadi, aks holda
      // sekin telefonda tugmalar bir soniyagacha bosilmay turardi.
      const k = 6 + 14 * Math.abs(target - current);
      current = reducedMotion ? target : current + (target - current) * (1 - Math.exp(-dt * k));
      if (Math.abs(target - current) < 0.0004) current = target;
      paintOverlays(current);
      scene?.frame(current, (now - start) / 1000, dt);
      if (inView && !document.hidden) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!raf && inView && !document.hidden && !disposed) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const resize = () => {
      scene?.resize(sticky.clientWidth, sticky.clientHeight);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(sticky);

    // Ekrandan chiqsa chizishni to'xtatamiz — batareya uchun
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      wake();
    });
    io.observe(track);

    const onVisibility = () => wake();
    document.addEventListener("visibilitychange", onVisibility);

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    // three.js alohida bo'lak bo'lib yuklanadi — matn va tugma kutmaydi
    import("./barbellScene")
      .then(({ createBarbellScene }) => {
        if (disposed) return;
        try {
          scene = createBarbellScene(canvas, { reducedMotion, lowPower });
          resize();
          setSceneState("ready");
        } catch {
          setSceneState("failed");
        }
      })
      .catch(() => {
        if (!disposed) setSceneState("failed");
      });

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setSceneState("failed");
      scene = null;
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    readProgress();
    current = target;
    wake();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      scene?.dispose();
      scene = null;
    };
  }, []);

  const setBeatRef = (i: number) => (el: HTMLDivElement | null) => {
    beatRefs.current[i] = el;
  };

  return (
    <section ref={trackRef} className="story-track relative bg-[#07080d]" aria-label="FitBoom haqida">
      <div ref={stickyRef} className="story-sticky sticky top-0 w-full overflow-hidden">
        {/* Fon: logotipdagi kabi qorong'i to'r va yuqoridan oltin nur */}
        <div className="absolute inset-0 story-bg" aria-hidden />
        <div className="absolute inset-0 story-grid" aria-hidden />

        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ${
            sceneState === "ready" ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden
        />
        {sceneState !== "ready" && <div className="absolute inset-0 story-fallback" aria-hidden />}

        {/* Yuqori panel — hikoyaning istalgan joyida boshlash mumkin */}
        <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 sm:px-10 pt-[max(1rem,env(safe-area-inset-top))]">
          <Wordmark className="text-2xl sm:text-3xl" />
          <button
            type="button"
            onClick={onStart}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
            data-testid="button-start-header"
          >
            Boshlash
          </button>
        </header>
        <div className="absolute inset-x-0 top-0 z-20 h-[2px] bg-white/5">
          <div ref={barRef} className="h-full origin-left bg-gradient-to-r from-[#f3d9a4] via-[#d9a751] to-[#a8742a]" style={{ transform: "scaleX(0)" }} />
        </div>

        {/* Matnlar: telefonda pastda, kompyuterda chap ustunda */}
        <div className="story-copy absolute inset-0 z-10 pointer-events-none">
          {/* 0 — bosh ekran */}
          <div ref={setBeatRef(0)} className="story-beat pointer-events-auto">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#d9a751]/90">
              Toshkent sport zallari · bitta ilovada
            </p>
            <h1 className="font-display text-[2.4rem] leading-[1.05] font-extrabold tracking-tight text-white sm:text-6xl">
              Sport zallariga
              <br />
              <span className="text-gold-gradient">bir kredit bilan</span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/60 sm:text-lg">
              Gym, yoga, boks, suzish — hammasi bitta hisobda. Bron qiling va QR bilan kiring.
            </p>
            <div className="mt-6 flex flex-col items-start gap-2">
              <GoldButton onClick={onStart} testId="button-start">
                Boshlash
              </GoldButton>
              <span className="text-xs text-white/40">Ro'yxatdan o'tish bepul</span>
            </div>
          </div>

          {BEATS.map((b, i) => (
            <div key={b.num} ref={setBeatRef(i + 1)} className="story-beat" style={{ opacity: 0 }}>
              <p className="mb-3 font-display text-sm font-bold tracking-[0.25em] text-[#d9a751]">
                {b.num} <span className="text-white/25">/ 04</span>
              </p>
              <h2 className="font-display text-[2rem] leading-[1.08] font-extrabold tracking-tight text-white sm:text-5xl">
                {b.title}
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/60 sm:text-lg">{b.body}</p>
            </div>
          ))}

          {/* 4 — yakun */}
          <div ref={setBeatRef(4)} className="story-beat pointer-events-auto" style={{ opacity: 0 }}>
            <p className="mb-3 font-display text-sm font-bold tracking-[0.25em] text-[#d9a751]">
              04 <span className="text-white/25">/ 04</span>
            </p>
            <h2 className="font-display text-[2rem] leading-[1.08] font-extrabold tracking-tight text-white sm:text-5xl">
              Keling. Skanerlang.
              <br />
              <span className="text-gold-gradient">Mashq qiling.</span>
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/60 sm:text-lg">
              Zaldagi QR kodni ilova bilan skanerlaysiz — kirish bir soniyada tasdiqlanadi.
            </p>
            <div className="mt-6 flex flex-col items-start gap-2">
              <GoldButton onClick={onStart} testId="button-start-final">
                Hozir boshlash
              </GoldButton>
              <span className="text-xs text-white/40">Ro'yxatdan o'tish bepul · 30 soniyada tayyor</span>
            </div>
          </div>
        </div>

        {/* Pastga surish ishorasi */}
        <div
          ref={hintRef}
          className="story-hint pointer-events-none absolute left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-white/45"
          aria-hidden
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Pastga suring</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </div>
      </div>
    </section>
  );
}

function GoldButton({
  onClick,
  children,
  testId,
}: {
  onClick: () => void;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="group inline-flex h-14 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#f3d9a4] via-[#d9a751] to-[#b98537] px-8 text-base font-bold text-[#1a1206] shadow-[0_10px_40px_-10px_rgba(217,167,81,0.7)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
    >
      {children}
      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
    </button>
  );
}
