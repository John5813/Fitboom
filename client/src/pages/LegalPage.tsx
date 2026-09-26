import { useMemo } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, AlertTriangle, FileText } from "lucide-react";
import { LEGAL_DOCS, findLegalDoc, LEGAL_LAST_UPDATED } from "@/content/legal";
import { cn } from "@/lib/utils";

/**
 * Huquqiy hujjatlar sahifasi.
 *
 * Yurist ko'rigini kutayotgan bandlar aniq belgilanadi — shunda hujjat
 * tugallanmagan holda nashr qilinib qolmaydi.
 */
export default function LegalPage() {
  const [, params] = useRoute("/legal/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug ?? "oferta";
  const doc = useMemo(() => findLegalDoc(slug), [slug]);

  const pendingCount = doc?.sections.filter((s) => s.pending).length ?? 0;

  if (!doc) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">Hujjat topilmadi</p>
        <Link href="/legal/oferta">
          <span className="cursor-pointer text-primary hover:underline">Ommaviy ofertaga o'tish</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Orqaga"
            data-testid="button-legal-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-display font-bold">{doc.title}</h1>
            <p className="truncate text-xs text-muted-foreground">
              Oxirgi yangilanish: {LEGAL_LAST_UPDATED}
            </p>
          </div>
        </div>

        {/* Hujjatlar o'rtasida almashish */}
        <nav className="mx-auto max-w-3xl overflow-x-auto px-4 pb-2">
          <div className="flex gap-2">
            {LEGAL_DOCS.map((d) => (
              <Link key={d.slug} href={`/legal/${d.slug}`}>
                <span
                  className={cn(
                    "inline-block cursor-pointer whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
                    d.slug === doc.slug
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                  data-testid={`link-legal-${d.slug}`}
                >
                  {d.title}
                </span>
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-5">
        <p className="mb-5 text-sm text-muted-foreground">{doc.summary}</p>

        {pendingCount > 0 && (
          <div
            className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
            data-testid="banner-legal-draft"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Loyiha holati — yurist ko'rigi kutilmoqda
              </p>
              <p className="mt-1 text-amber-700/90 dark:text-amber-400/90">
                {pendingCount} ta band hali to'ldirilmagan. Bu hujjat shu holicha
                yuridik kuchga ega emas.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-7">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-2 flex flex-wrap items-center gap-2 text-base font-semibold">
                {section.heading}
                {section.pending && (
                  <span className="rounded border border-amber-500/50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-500">
                    to'ldirilmagan
                  </span>
                )}
              </h2>
              <div className="space-y-2">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
