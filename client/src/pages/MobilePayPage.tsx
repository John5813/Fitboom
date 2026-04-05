import { useState, useRef } from "react";
import { useSearch } from "wouter";
import { KeyRound, CreditCard, Upload, Copy, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";

const CARD_NUMBER = "9860160104562378";
const CARD_HOLDER = "Javlonbek Mo'ydinov";
const PRODUCTION_URL = "https://fitboom.replit.app";

const packages = [
  { credits: 60, price: 60000 },
  { credits: 130, price: 130000, isPopular: true },
  { credits: 240, price: 240000 },
];

type Step = "packages" | "payment" | "success";

export default function MobilePayPage() {
  const search = useSearch();
  // Token birinchi renderda bir marta olinadi va saqlanadi.
  // AuthContext URL dan ?token= ni o'chirganda qayta render bo'lsa ham token yo'qolmaydi.
  const [token] = useState(() => new URLSearchParams(search).get("token") || "");

  const [step, setStep] = useState<Step>("packages");
  const [selected, setSelected] = useState<{ credits: number; price: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const apiBase = PRODUCTION_URL + "/api/mobile/v1";

  const handleSelectPackage = (pkg: { credits: number; price: number }) => {
    setSelected(pkg);
    setStep("payment");
    setError("");
  };

  const copyCard = () => {
    navigator.clipboard.writeText(CARD_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      formData.append("credits", String(selected.credits));
      formData.append("price", String(selected.price));

      const res = await fetch(`${apiBase}/credits/purchase`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStep("success");
      } else {
        setError(data.error || data.message || "Xatolik yuz berdi");
      }
    } catch {
      setError("Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <div className="text-center text-white">
          <p className="text-red-400 font-semibold">Token topilmadi</p>
          <p className="text-gray-400 text-sm mt-1">Ilovadan qayta ochib ko'ring</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col" data-testid="mobile-pay-page">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        {step === "payment" && (
          <button
            onClick={() => { setStep("packages"); setError(""); }}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-bold">
            {step === "success" ? "To'lov qabul qilindi" : "Kredit sotib olish"}
          </h1>
          {step === "packages" && (
            <p className="text-gray-400 text-xs mt-0.5">Paket tanlang</p>
          )}
          {step === "payment" && selected && (
            <p className="text-gray-400 text-xs mt-0.5">
              {selected.credits} kredit — {selected.price.toLocaleString()} so'm
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 pb-8">

        {/* STEP 1: Package selection */}
        {step === "packages" && (
          <div className="space-y-3 mt-2">
            {packages.map((pkg) => (
              <button
                key={pkg.credits}
                onClick={() => handleSelectPackage(pkg)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between active:scale-[0.98] transition-transform relative"
                data-testid={`button-package-${pkg.credits}`}
              >
                {pkg.isPopular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                    Mashhur
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-base">{pkg.credits} kredit</p>
                    <p className="text-gray-400 text-sm">{pkg.price.toLocaleString()} so'm</p>
                  </div>
                </div>
                <span className="bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                  Tanlash
                </span>
              </button>
            ))}
          </div>
        )}

        {/* STEP 2: Payment details */}
        {step === "payment" && selected && (
          <div className="space-y-4 mt-2">
            {/* Amount */}
            <div className="rounded-2xl bg-orange-500/10 border border-orange-500/30 p-4 text-center">
              <p className="text-gray-400 text-xs mb-1">To'lov miqdori</p>
              <p className="text-3xl font-bold text-orange-400">
                {selected.price.toLocaleString()} so'm
              </p>
              <p className="text-gray-400 text-xs mt-1">{selected.credits} kredit uchun</p>
            </div>

            {/* Card info */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-orange-400" />
                <p className="text-sm font-semibold text-gray-300">Karta ma'lumotlari</p>
              </div>

              <div className="bg-black/30 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-[10px] mb-0.5">Karta raqami</p>
                  <p className="font-mono font-bold text-base tracking-widest">
                    {CARD_NUMBER.replace(/(.{4})/g, '$1 ').trim()}
                  </p>
                </div>
                <button
                  onClick={copyCard}
                  className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-95 transition-transform"
                  data-testid="button-copy-card"
                >
                  {copied
                    ? <CheckCircle className="w-4 h-4 text-green-400" />
                    : <Copy className="w-4 h-4 text-gray-400" />
                  }
                </button>
              </div>

              <div className="bg-black/30 rounded-xl p-3">
                <p className="text-gray-500 text-[10px] mb-0.5">Karta egasi</p>
                <p className="font-semibold">{CARD_HOLDER}</p>
              </div>
            </div>

            {/* Instruction */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-gray-400 text-xs leading-relaxed">
                Yuqoridagi karta raqamiga <span className="text-white font-semibold">{selected.price.toLocaleString()} so'm</span> o'tkazing, so'ng to'lov chekining rasmini yuboring. Admin tasdiqlangach kredit hisobingizga tushadi.
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-receipt-file"
            />

            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              data-testid="button-send-receipt"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Yuklanmoqda...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Chek rasmini yuborish
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 3: Success */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center mt-16 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Chek yuborildi!</h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              To'lov chekingiz admin tomonidan ko'rib chiqilmoqda. Tasdiqlangandan so'ng kredit hisobingizga tushadi.
            </p>
            <div className="mt-8 rounded-2xl bg-white/5 border border-white/10 p-4 w-full max-w-xs">
              <p className="text-gray-400 text-xs">Tanlangan paket</p>
              <p className="font-bold text-lg mt-1">{selected?.credits} kredit</p>
              <p className="text-gray-400 text-sm">{selected?.price.toLocaleString()} so'm</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
