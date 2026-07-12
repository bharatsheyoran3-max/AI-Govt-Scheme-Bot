import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { HelpFooter } from "@/components/HelpFooter";
import { useSession, setConsent } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Database, KeyRound, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/consent")({
  head: () => ({
    meta: [
      { title: "Consent — SchemeSathi" },
      { name: "description", content: "How SchemeSathi uses your answers. Data stays on your device unless you choose to save it." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConsentPage,
});

function ConsentPage() {
  const { lang } = useSession();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            {t(lang, "consent_title")}
          </h1>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          {[
            { icon: Database, text: t(lang, "consent_p1") },
            { icon: ShieldCheck, text: t(lang, "consent_p2") },
            { icon: KeyRound, text: t(lang, "consent_p3") },
            { icon: RotateCcw, text: t(lang, "consent_p4") },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-foreground">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" className="h-12">
            <Link to="/">{t(lang, "consent_decline")}</Link>
          </Button>
          <Button
            className="h-12 bg-saffron px-6 text-saffron-foreground hover:bg-saffron/90"
            onClick={() => { setConsent(true); navigate({ to: "/questionnaire" }); }}
          >
            {t(lang, "consent_agree")}
          </Button>
        </div>
      </main>
      <HelpFooter />
    </div>
  );
}
