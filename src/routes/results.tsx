import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { HelpFooter } from "@/components/HelpFooter";
import { useSession } from "@/lib/session";
import { t, type LangCode } from "@/lib/i18n";
import { evaluateAll, type Confidence } from "@/lib/eligibility";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, AlertCircle, HelpCircle, Inbox } from "lucide-react";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Your eligible schemes — SchemeSathi" },
      { name: "description", content: "Ranked government schemes you may qualify for, based on your answers." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Results,
});

function pickLang<T>(dict: Partial<Record<LangCode, T>>, lang: LangCode): T | undefined {
  return dict[lang] ?? dict.en;
}

function confBadge(c: Confidence, lang: LangCode) {
  if (c === "high") return { label: t(lang, "match_high"), Icon: CheckCircle2, className: "bg-success/15 text-success border-success/30" };
  if (c === "medium") return { label: t(lang, "match_medium"), Icon: AlertCircle, className: "bg-warning/20 text-warning-foreground border-warning/40" };
  return { label: t(lang, "match_low"), Icon: HelpCircle, className: "bg-muted text-muted-foreground border-border" };
}

function Results() {
  const { lang, profile } = useSession();
  const matches = useMemo(() => evaluateAll(profile), [profile]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          {t(lang, "results_title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(lang, "results_sub", { n: matches.length })}
        </p>

        {matches.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">{t(lang, "no_matches")}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/questionnaire">{t(lang, "back")}</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {matches.map(({ scheme, confidence }) => {
              const c = confBadge(confidence, lang);
              return (
                <li key={scheme.id}>
                  <Link
                    to="/scheme/$id"
                    params={{ id: scheme.id }}
                    className="group block rounded-2xl border border-border bg-card p-5 shadow-card transition hover:border-primary/50 hover:shadow-elevated"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {scheme.ministry}
                        </div>
                        <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
                          {pickLang(scheme.name, lang)}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {pickLang(scheme.summary, lang)}
                        </p>
                      </div>
                      <Badge variant="outline" className={`gap-1.5 whitespace-nowrap ${c.className}`}>
                        <c.Icon className="h-3.5 w-3.5" />
                        {c.label}
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-center text-sm font-medium text-primary">
                      {t(lang, "view_details")}
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="outline" className="h-12">
            <Link to="/questionnaire">{t(lang, "back")}</Link>
          </Button>
          <Button asChild variant="ghost" className="h-12">
            <Link to="/">{t(lang, "restart")}</Link>
          </Button>
        </div>
      </main>
      <HelpFooter />
    </div>
  );
}
