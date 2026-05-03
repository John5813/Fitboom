import { Button } from "@/components/ui/button";
import { Dumbbell, KeyRound, QrCode, Video, MapPin, ArrowRight, Zap, Users, Trophy } from "lucide-react";
import fitboomLogo from "@/assets/fitboom-logo.png";

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen overflow-y-auto bg-background">

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-20">

        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 50% -10%, #f97316 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 100%, #0ea5e9 0%, transparent 60%)",
            animation: "hero-glow 6s ease-in-out infinite",
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 w-full max-w-lg text-center space-y-8">

          {/* Logo */}
          <div className="flex items-center justify-center">
            <img
              src={fitboomLogo}
              alt="FitBoom"
              className="h-32 w-auto drop-shadow-2xl"
              data-testid="img-logo"
            />
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Sport zallariga<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                bir kredit bilan
              </span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-sm mx-auto">
              Toshkent bo'ylab eng yaxshi fitness zallarini bir joyda toping, bron qiling va kiring.
            </p>
          </div>

          {/* Stat pills */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { icon: <MapPin className="w-3.5 h-3.5" />, label: "Toshkent bo'ylab" },
              { icon: <Zap className="w-3.5 h-3.5" />, label: "Tezkor bron" },
              { icon: <QrCode className="w-3.5 h-3.5" />, label: "QR kirish" },
            ].map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/80 text-xs font-medium backdrop-blur-sm"
              >
                {s.icon}
                {s.label}
              </span>
            ))}
          </div>

          {/* CTA */}
          <Button
            onClick={onStart}
            size="lg"
            data-testid="button-start"
            className="w-full max-w-xs mx-auto h-14 rounded-2xl text-base font-bold bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white border-0 shadow-lg shadow-orange-500/40 gap-2 transition-all duration-200"
          >
            Boshlash
            <ArrowRight className="w-5 h-5" />
          </Button>

          <p className="text-gray-400 text-sm">
            Ro'yxatdan o'tish bepul · 30 soniyada tayyor
          </p>
        </div>
      </section>

      {/* ═══ 3 ASOSIY AFZALLIK ═══ */}
      <section className="py-16 px-6 bg-background">
        <div className="max-w-2xl mx-auto space-y-10">

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold text-foreground">Nima beradi?</h2>
            <p className="text-muted-foreground">Bir platformada hamma narsa</p>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: <KeyRound className="w-6 h-6 text-orange-500" />,
                bg: "bg-orange-50 dark:bg-orange-950/40",
                title: "Kredit tizimi",
                desc: "60, 130 yoki 240 ta kredit sotib oling — har kredit bitta zalga kirish. Turli zallarni sinab ko'ring, bitta obunaga bog'lanmang.",
              },
              {
                icon: <Dumbbell className="w-6 h-6 text-blue-500" />,
                bg: "bg-blue-50 dark:bg-blue-950/40",
                title: "Ko'plab sport zallari",
                desc: "Gym, yoga, boks, pilates, suzish havzalari va boshqa zallar. Haritadan eng yaqinini toping va bron qiling.",
              },
              {
                icon: <Video className="w-6 h-6 text-violet-500" />,
                bg: "bg-violet-50 dark:bg-violet-950/40",
                title: "Online darslar",
                desc: "Kredit bilan professional ustozlarning video kurslarini ham oling. Uyda ham, zalda ham mashq qiling.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${f.bg}`}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ QANDAY ISHLAYDI ═══ */}
      <section className="py-16 px-6 bg-muted/40 dark:bg-muted/10">
        <div className="max-w-2xl mx-auto space-y-10">

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold text-foreground">Qanday ishlaydi?</h2>
            <p className="text-muted-foreground">4 qadam — hammasi shu</p>
          </div>

          <div className="space-y-3">
            {[
              {
                num: "01",
                title: "Ro'yxatdan o'ting",
                desc: "Telegram yoki telefon raqam orqali — 30 soniyada tayyor.",
                color: "text-orange-500",
                border: "border-orange-500/30 bg-orange-500/5",
              },
              {
                num: "02",
                title: "Kredit sotib oling",
                desc: "O'zingizga mos paketni tanlang va to'liq raqamga o'tkazing.",
                color: "text-blue-500",
                border: "border-blue-500/30 bg-blue-500/5",
              },
              {
                num: "03",
                title: "Zalni bron qiling",
                desc: "Haritadan yaqin zalni toping, qulay vaqtni tanlang va bir bosim bilan band qiling.",
                color: "text-violet-500",
                border: "border-violet-500/30 bg-violet-500/5",
              },
              {
                num: "04",
                title: "QR bilan kiring",
                desc: "Zalga borib telefoningizni ko'rsating — QR kod skanerlangan va kirish ochiq.",
                color: "text-emerald-500",
                border: "border-emerald-500/30 bg-emerald-500/5",
              },
            ].map((step) => (
              <div
                key={step.num}
                className={`flex items-start gap-4 p-4 rounded-2xl border ${step.border}`}
              >
                <span className={`text-2xl font-extrabold tracking-tighter flex-shrink-0 ${step.color}`}>
                  {step.num}
                </span>
                <div>
                  <h4 className="font-bold text-foreground">{step.title}</h4>
                  <p className="text-muted-foreground text-sm mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="py-16 px-6 bg-background">
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <MapPin className="w-5 h-5 text-orange-500" />, value: "20+", label: "Sport zallari" },
              { icon: <Users className="w-5 h-5 text-blue-500" />, value: "1000+", label: "Faol a'zolar" },
              { icon: <Trophy className="w-5 h-5 text-violet-500" />, value: "5★", label: "Reyting" },
            ].map((s) => (
              <div
                key={s.label}
                className="text-center p-4 rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className="flex justify-center mb-2">{s.icon}</div>
                <div className="text-2xl font-extrabold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BOTTOM CTA ═══ */}
      <section className="py-16 px-6 bg-gradient-to-b from-background to-muted/30 dark:to-muted/10">
        <div className="max-w-sm mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-foreground">Tayyormisiz?</h2>
            <p className="text-muted-foreground text-sm">
              Bugun boshlang — birinchi bron bepul konsultatsiya bilan!
            </p>
          </div>
          <Button
            onClick={onStart}
            size="lg"
            data-testid="button-start-bottom"
            className="w-full h-14 rounded-2xl text-base font-bold bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white border-0 shadow-lg shadow-orange-500/30 gap-2 transition-all duration-200"
          >
            Hozir Boshlash
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

    </div>
  );
}
