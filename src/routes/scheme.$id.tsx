import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { HelpFooter } from "@/components/HelpFooter";
import { useSession } from "@/lib/session";
import { t, type LangCode } from "@/lib/i18n";
import { SCHEMES, DOC_LABELS } from "@/lib/schemes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ExternalLink, FileText, Gift, MapPin } from "lucide-react";

export const Route = createFileRoute("/scheme/$id")({
  loader: ({ params }) => {
    const scheme = SCHEMES.find((s) => s.id === params.id);
    if (!scheme) throw notFound();
    return { schemeId: scheme.id };
  },
  head: ({ loaderData }) => {
    const scheme = loaderData ? SCHEMES.find((s) => s.id === loaderData.schemeId) : undefined;
    const title = scheme ? `${scheme.name.en} — SchemeSathi` : "Scheme details — SchemeSathi";
    const desc = scheme?.summary.en ?? "Government scheme details, benefits, and required documents.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: SchemeDetail,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Scheme not found</h1>
        <Button asChild className="mt-4"><Link to="/results">Back to results</Link></Button>
      </main>
    </div>
  ),
});

function pickLang<T>(dict: Partial<Record<LangCode, T>>, lang: LangCode): T | undefined {
  return dict[lang] ?? dict.en;
}

function SchemeDetail() {
  const { schemeId } = Route.useLoaderData();
  const { lang } = useSession();
  const scheme = SCHEMES.find((s) => s.id === schemeId)!;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" className="mb-4 -ml-3 h-10">
          <Link to="/results"><ArrowLeft className="mr-2 h-4 w-4" /> {t(lang, "back")}</Link>
        </Button>

        <div className="rounded-2xl bg-hero p-6 text-primary-foreground shadow-elevated">
          <div className="text-xs font-medium uppercase tracking-wide text-primary-foreground/75">
            {scheme.ministry}
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
            {pickLang(scheme.name, lang)}
          </h1>
          <p className="mt-2 text-primary-foreground/90">
            {pickLang(scheme.summary, lang)}
          </p>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-primary">
              <Gift className="h-5 w-5" />
              <h2 className="font-display text-base font-semibold">{t(lang, "benefit")}</h2>
            </div>
            <p className="mt-2 text-sm text-foreground">{pickLang(scheme.benefit, lang)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="h-5 w-5" />
              <h2 className="font-display text-base font-semibold">{t(lang, "where_to_apply")}</h2>
            </div>
            <p className="mt-2 text-sm text-foreground">{pickLang(scheme.whereToApply, lang)}</p>
            <a
              href={scheme.sourceUrl}
              target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t(lang, "source")} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" />
            <h2 className="font-display text-base font-semibold">{t(lang, "documents_needed")}</h2>
          </div>
          <ul className="mt-4 space-y-2">
            {scheme.documents.map((docId) => {
              const label = pickLang(DOC_LABELS[docId] ?? {}, lang) ?? docId;
              const isChecked = !!checked[docId];
              return (
                <li key={docId}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                      isChecked ? "border-success/40 bg-success/5" : "border-border bg-background hover:bg-accent"
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(v) => setChecked((c) => ({ ...c, [docId]: !!v }))}
                    />
                    <span className={`text-sm ${isChecked ? "text-success" : "text-foreground"}`}>
                      {label}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {isChecked ? t(lang, "doc_have") : t(lang, "doc_missing")}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
      <HelpFooter />
    </div>
  );
}
