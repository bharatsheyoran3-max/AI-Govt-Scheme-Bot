import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { HelpFooter } from "@/components/HelpFooter";
import { useSession, setConsent } from "@/lib/session";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, Database, KeyRound, RotateCcw, AlertTriangle } from "lucide-react";

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
  const { lang, userId } = useSession();
  const navigate = useNavigate();

  // Granular consent purposes, unchecked by default
  const [screening, setScreening] = useState(false);
  const [autoFill, setAutoFill] = useState(false);
  const [submission, setSubmission] = useState(false);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!screening) {
      setError(t(lang, "consent_warning"));
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/v1/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          purposes: { screening, autoFill, submission }
        })
      });

      if (!response.ok) {
        throw new Error("Failed to register consent logs.");
      }

      setConsent({ screening, autoFill, submission });
      navigate({ to: "/questionnaire" });
    } catch (err: any) {
      console.error(err);
      // Fallback: Proceed client-side anyway to prevent breaking flow if backend has issues
      setConsent({ screening, autoFill, submission });
      navigate({ to: "/questionnaire" });
    } finally {
      setLoading(false);
    }
  };

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

        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="space-y-3 pb-4 border-b border-border">
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

          <h2 className="font-display text-lg font-semibold text-foreground mt-4">
            Select what you permit:
          </h2>

          <div className="space-y-3">
            {/* Screening Checkbox */}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all hover:bg-accent border-border bg-background">
              <Checkbox
                id="check-screening"
                checked={screening}
                onCheckedChange={(checked) => setScreening(!!checked)}
                className="mt-1 h-5 w-5"
              />
              <div className="leading-relaxed">
                <span className="text-sm font-semibold text-foreground block">
                  {t(lang, "consent_screening")}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  Allows verifying age, income, state, etc. to match you with schemes. (Required)
                </span>
              </div>
            </label>

            {/* Auto-fill Checkbox */}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all hover:bg-accent border-border bg-background">
              <Checkbox
                id="check-autofill"
                checked={autoFill}
                onCheckedChange={(checked) => setAutoFill(!!checked)}
                className="mt-1 h-5 w-5"
              />
              <div className="leading-relaxed">
                <span className="text-sm font-semibold text-foreground block">
                  {t(lang, "consent_autofill")}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  Speeds up application filling by caching inputs locally in this session.
                </span>
              </div>
            </label>

            {/* Submission Checkbox */}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all hover:bg-accent border-border bg-background">
              <Checkbox
                id="check-submission"
                checked={submission}
                onCheckedChange={(checked) => setSubmission(!!checked)}
                className="mt-1 h-5 w-5"
              />
              <div className="leading-relaxed">
                <span className="text-sm font-semibold text-foreground block">
                  {t(lang, "consent_submission")}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  Integrates with portals like MyScheme or DigiLocker to submit forms for you.
                </span>
              </div>
            </label>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" className="h-12">
            <Link to="/">{t(lang, "consent_decline")}</Link>
          </Button>
          <Button
            className="h-12 bg-saffron px-6 text-saffron-foreground hover:bg-saffron/90"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Registering..." : t(lang, "consent_agree")}
          </Button>
        </div>
      </main>
      <HelpFooter />
    </div>
  );
}
