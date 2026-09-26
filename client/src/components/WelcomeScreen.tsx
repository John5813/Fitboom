import { lazy, Suspense } from "react";
import { Link } from "wouter";
import { ArrowRight, Dumbbell, KeyRound, Video } from "lucide-react";
import Wordmark from "@/components/brand/Wordmark";
import { CREDIT_PACKAGES } from "@shared/pricing";
import { LEGAL_DOCS } from "@/content/legal";

// 3D hikoya alohida bo'lakda — sahifaning qolgan qismi uni kutmaydi
const HeroStory = lazy(() => import("@/components/landing/HeroStory"));

interface WelcomeScreenProps {
  onStart: () => void;
}

const packageList = (() => {
  const n = CREDIT_PACKAGES.map((p) => p.credits);
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} yoki ${n[n.length - 1]}` : String(n[0]);
})();

/*
 * Matnlar koddagi haqiqiy xatti-harakatga mos yozilgan. Ilgari bu sahifada
 * "1000+ faol a'zo", "5★ reyting", "birinchi bron bepul konsultatsiya" kabi
 * tasdiqlanmagan da'volar turardi — ular olib tashlandi.
 */
const FEATURES = [
  {
    icon: KeyRound,
    title: "Kredit tizimi",
    desc: `${packageList} kredit. Har zal kirish narxini kreditda belgilaydi — turli zallarni sinab ko'ring, bittasiga bog'lanmang.`,
  },
  {
    icon: Dumbbell,
    title: "Turli yo'nalishlar",
    desc: "Gym, yoga, boks, pilates, suzish va boshqalar. Haritadan eng yaqinini toping.",
  },
  {
    icon: Video,
    title: "Online darslar",
    desc: "Kredit bilan ustozlarning video kurslarini ham oling. Uyda ham, zalda ham mashq qiling.",
  },
];

const STEPS = [
  { title: "Ro'yxatdan o'ting", desc: "Telegram yoki telefon raqam orqali." },
  {
    title: "Kredit oling",
    desc: "Paketni tanlang, kartaga o'tkazing va chek rasmini yuboring. Tasdiqlangach kredit tushadi.",
  },
  { title: "Bron qiling", desc: "Zal va qulay vaqtni tanlang — bir bosishda." },
  { title: "QR bilan kiring", desc: "Zaldagi QR kodni ilova bilan skanerlang." },
];

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      <Suspense fallback={<div className="story-sticky story-bg" />}>
        <HeroStory onStart={onStart} />
      </Suspense>

      {/* ═══ Qo'shimcha imkoniyatlar ═══ */}
      <section className="relative px-5 py-20 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Bir ilovada <span className="text-gold-gradient">hammasi</span>
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[#d9a751]/40"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d9a751]/10">
                  <Icon className="h-5 w-5 text-[#e2b86a]" />
                </div>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Qanday ishlaydi ═══ */}
      <section className="px-5 pb-20 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Qanday ishlaydi?
          </h2>
          <ol className="mt-10 grid gap-3 sm:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-3xl border border-white/10 p-5">
                <span className="font-display text-2xl font-extrabold text-gold-gradient">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/55">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ═══ Yakuniy chaqiruv ═══ */}
      <section className="relative overflow-hidden px-5 py-24 text-center sm:px-10">
        <div className="absolute inset-0 story-bg opacity-70" aria-hidden />
        <div className="relative mx-auto max-w-md">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Tayyormisiz?</h2>
          <p className="mt-3 text-white/55">Ro'yxatdan o'tish bepul — 30 soniyada tayyor.</p>
          <button
            type="button"
            onClick={onStart}
            data-testid="button-start-bottom"
            className="mt-8 inline-flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f3d9a4] via-[#d9a751] to-[#b98537] text-base font-bold text-[#1a1206] shadow-[0_10px_40px_-10px_rgba(217,167,81,0.7)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Hozir boshlash
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 sm:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark className="text-xl" />
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/45">
            {LEGAL_DOCS.map((d) => (
              <Link key={d.slug} href={`/legal/${d.slug}`} className="hover:text-white">
                {d.title}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
