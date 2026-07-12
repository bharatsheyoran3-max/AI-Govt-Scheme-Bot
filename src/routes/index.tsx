import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { HelpFooter } from "@/components/HelpFooter";
import { useSession, setLang } from "@/lib/session";
import { LANGUAGES, t, type LangCode } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, FileCheck2, Languages, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { lang } = useSession();
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, oklch(0.78 0.16 65 / .6), transparent 40%), radial-gradient(circle at 80% 80%, oklch(0.6 0.2 265 / .6), transparent 45%)",
        }} />
        <div className="relative mx-auto grid max-w-5xl gap-8 px-4 py-14 sm:py-20 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium ring-1 ring-primary-foreground/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              Data stays on your device
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              {t(lang, "hero_title")}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
              {t(lang, "hero_sub")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 bg-saffron px-6 text-saffron-foreground shadow-elevated hover:bg-saffron/90">
                <Link to="/consent">
                  {t(lang, "start")} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Language picker card */}
          <div className="rounded-2xl bg-card p-5 text-card-foreground shadow-elevated">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
              <Languages className="h-4 w-4" />
              {t(lang, "choose_language")}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => {
                const active = l.code === lang;
                return (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code as LangCode)}
                    className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border bg-background hover:border-primary/40 hover:bg-accent"
                    }`}
                  >
                    <span className="text-base font-semibold text-foreground">{l.native}</span>
                    <span className="text-xs text-muted-foreground">{l.english}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Languages, title: "1 · Pick your language", body: "Six Indian languages supported at launch. Add or switch anytime." },
            { icon: CheckCircle2, title: "2 · Answer a few questions", body: "Age, income, occupation and a few more. Skip anything you're unsure of." },
            { icon: FileCheck2, title: "3 · See eligible schemes", body: "A ranked list of schemes with a clear document checklist for each." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-display text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <HelpFooter />
    </div>
  );
}
