import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { HelpFooter } from "@/components/HelpFooter";
import { useSession } from "@/lib/session";
import { t, type LangCode } from "@/lib/i18n";
import { evaluateAll, type Confidence } from "@/lib/eligibility";
import { SCHEMES, type UserProfile } from "@/lib/schemes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, AlertCircle, HelpCircle, Inbox, Volume2, MessageSquare, Phone } from "lucide-react";

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

function pickLang(dict: Partial<Record<LangCode, string>>, lang: LangCode): string {
  return dict[lang] ?? dict.en ?? "";
}

function confBadge(c: Confidence, lang: LangCode) {
  if (c === "high") return { label: t(lang, "match_high"), Icon: CheckCircle2, className: "bg-success/15 text-success border-success/30" };
  if (c === "medium") return { label: t(lang, "match_medium"), Icon: AlertCircle, className: "bg-warning/20 text-warning-foreground border-warning/40" };
  return { label: t(lang, "match_low"), Icon: HelpCircle, className: "bg-muted text-muted-foreground border-border" };
}

function Results() {
  const { lang, profile, userId } = useSession();
  
  const [matches, setMatches] = useState<Array<{
    scheme: any;
    confidence: Confidence;
    status: string;
    missingFields: string[];
    version?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const checkEligibility = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/v1/eligibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, profile })
        });

        if (!response.ok) {
          throw new Error("Server checks failed");
        }

        const data = await response.json();
        
        const mapped = data.results
          .filter((r: any) => r.status === "eligible" || r.status === "needs_clarification")
          .map((r: any) => {
            const scheme = SCHEMES.find(s => s.id === r.schemeId);
            return {
              scheme,
              confidence: r.confidence,
              status: r.status,
              missingFields: r.missingFields,
              version: r.version
            };
          })
          .filter((m: any) => m.scheme !== undefined);

        setMatches(mapped);
        setIsOffline(false);
      } catch (err) {
        console.warn("[Eligibility] Using client-side rules execution fallback:", err);
        setIsOffline(true);
        
        // Local evaluation fallback
        const localMatches = evaluateAll(profile);
        setMatches(localMatches.map(m => ({
          scheme: m.scheme,
          confidence: m.confidence,
          status: m.confidence === "low" ? "needs_clarification" : "eligible",
          missingFields: m.scheme.softFields?.filter(f => profile[f] === undefined) || []
        })));
      } finally {
        setLoading(false);
      }
    };

    checkEligibility();
  }, [profile, userId]);

  // TTS Read result text
  const speakResult = (schemeName: string, summary: string, confidence: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const localeMap: Record<string, string> = {
      en: "en-IN", hi: "hi-IN", bn: "bn-IN", ta: "ta-IN", te: "te-IN", mr: "mr-IN"
    };

    const text = `${schemeName}. ${summary}. Status is: ${confidence}. Tap View Details to inspect document lists.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = localeMap[lang] || "en-IN";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            {t(lang, "results_title")}
          </h1>
        </div>

        {isOffline && (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Offline mode active. Displaying client-side local estimations.</span>
          </div>
        )}

        <p className="mt-2 text-sm text-muted-foreground">
          {t(lang, "results_sub", { n: matches.length })}
        </p>

        {loading ? (
          <div className="mt-8 flex flex-col items-center justify-center p-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-muted-foreground">Evaluating rules engine...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">{t(lang, "no_matches")}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/questionnaire">{t(lang, "back")}</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {matches.map(({ scheme, confidence, missingFields, version }) => {
              const c = confBadge(confidence, lang);
              const name = pickLang(scheme.name, lang);
              const summary = pickLang(scheme.summary, lang);
              
              return (
                <li key={scheme.id}>
                  <div
                    className="group relative block rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-elevated"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 pr-8">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <span>{scheme.ministry}</span>
                          {version && <span>· Version {version}</span>}
                        </div>
                        <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
                          {name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {summary}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant="outline" className={`gap-1.5 whitespace-nowrap ${c.className}`}>
                          <c.Icon className="h-3.5 w-3.5" />
                          {c.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => speakResult(name, summary, c.label)}
                          aria-label={`Read results for ${name}`}
                          className="h-8 w-8 text-primary/80 hover:text-primary border border-border"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {missingFields.length > 0 && (
                      <div className="mt-3 text-xs bg-muted/50 p-2.5 rounded-lg border border-border text-muted-foreground">
                        <span className="font-semibold text-foreground">Clarification needed:</span> missing details for{" "}
                        {missingFields.join(", ")}. We assumed eligible for this check.
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                      <Link
                        to="/scheme/$id"
                        params={{ id: scheme.id }}
                        className="inline-flex items-center text-sm font-bold text-primary hover:underline"
                      >
                        {t(lang, "view_details")}
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="outline" className="h-12 border-border text-base">
            <Link to="/questionnaire">{t(lang, "back")}</Link>
          </Button>
          <Button asChild variant="ghost" className="h-12 text-base text-muted-foreground">
            <Link to="/">{t(lang, "restart")}</Link>
          </Button>
        </div>

        {/* Human Escalation Options - Always Visible Section */}
        <section className="mt-10 rounded-2xl border border-success/30 bg-success/5 p-5">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-success animate-pulse" /> Urgent Application Assistance
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Need help retrieving documents or filling out applications? Contact a verified Common Service Centre operator instantly.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://wa.me/911800110001?text=Hello%2C%20I%20am%20using%20SchemeSathi%20and%20need%20help%20applying%20for%20schemes."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-success px-5 py-3 text-sm font-bold text-white shadow-elevated hover:bg-success/90 transition-all"
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp Operator
            </a>
            <a
              href="tel:1800110001"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-background px-5 py-3 text-sm font-bold text-success hover:bg-success/5 transition-all"
            >
              <Phone className="h-4 w-4" /> Call Toll-Free
            </a>
          </div>
        </section>
      </main>

      <HelpFooter />
    </div>
  );
}
