import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { HelpFooter } from "@/components/HelpFooter";
import { useSession, updateProfile } from "@/lib/session";
import { t, type LangCode } from "@/lib/i18n";
import { INDIAN_STATES, type UserProfile } from "@/lib/schemes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/questionnaire")({
  head: () => ({
    meta: [
      { title: "Eligibility questions — SchemeSathi" },
      { name: "description", content: "Answer a few simple questions to see which government schemes you may qualify for." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Questionnaire,
});

type OptChoice = { value: string; labelKey: string };

interface Step {
  key: keyof UserProfile;
  qKey: string;
  kind: "select" | "number" | "yesno";
  options?: OptChoice[];
  min?: number;
  max?: number;
  suffix?: string;
  parse?: (v: string) => unknown;
}

const STEPS: Step[] = [
  {
    key: "state", qKey: "q_state", kind: "select",
    options: INDIAN_STATES.map((s) => ({ value: s, labelKey: s })),
  },
  { key: "age", qKey: "q_age", kind: "number", min: 1, max: 120, suffix: "years", parse: (v) => Number(v) },
  {
    key: "gender", qKey: "q_gender", kind: "select",
    options: [
      { value: "male", labelKey: "gender_male" },
      { value: "female", labelKey: "gender_female" },
      { value: "other", labelKey: "gender_other" },
    ],
  },
  {
    key: "income", qKey: "q_income", kind: "select",
    options: [
      { value: "50000", labelKey: "income_1" },
      { value: "175000", labelKey: "income_2" },
      { value: "375000", labelKey: "income_3" },
      { value: "650000", labelKey: "income_4" },
      { value: "1000000", labelKey: "income_5" },
    ],
    parse: (v) => Number(v),
  },
  {
    key: "occupation", qKey: "q_occupation", kind: "select",
    options: [
      { value: "farmer", labelKey: "occ_farmer" },
      { value: "student", labelKey: "occ_student" },
      { value: "salaried", labelKey: "occ_salaried" },
      { value: "self", labelKey: "occ_self" },
      { value: "unemployed", labelKey: "occ_unemployed" },
      { value: "retired", labelKey: "occ_retired" },
    ],
  },
  {
    key: "category", qKey: "q_category", kind: "select",
    options: [
      { value: "general", labelKey: "cat_general" },
      { value: "obc", labelKey: "cat_obc" },
      { value: "sc", labelKey: "cat_sc" },
      { value: "st", labelKey: "cat_st" },
      { value: "ews", labelKey: "cat_ews" },
    ],
  },
  {
    key: "land", qKey: "q_land", kind: "select",
    options: [
      { value: "none", labelKey: "land_none" },
      { value: "small", labelKey: "land_small" },
      { value: "medium", labelKey: "land_medium" },
      { value: "large", labelKey: "land_large" },
    ],
  },
  { key: "disability", qKey: "q_disability", kind: "yesno" },
  {
    key: "ration", qKey: "q_ration", kind: "select",
    options: [
      { value: "bpl", labelKey: "ration_bpl" },
      { value: "aay", labelKey: "ration_aay" },
      { value: "apl", labelKey: "ration_apl" },
      { value: "none", labelKey: "ration_none" },
    ],
  },
  { key: "familySize", qKey: "q_family_size", kind: "number", min: 1, max: 30, parse: (v) => Number(v) },
];

function Questionnaire() {
  const { lang, profile } = useSession();
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const total = STEPS.length;
  const progress = useMemo(() => Math.round(((i + 1) / total) * 100), [i, total]);

  const currentValue = (() => {
    const v = profile[step.key];
    if (v === undefined || v === null) return "";
    if (typeof v === "boolean") return v ? "yes" : "no";
    return String(v);
  })();

  const handleChoice = (raw: string) => {
    let parsed: unknown;
    if (step.kind === "yesno") parsed = raw === "yes";
    else if (step.parse) parsed = step.parse(raw);
    else parsed = raw;
    updateProfile({ [step.key]: parsed } as Partial<UserProfile>);
  };

  const skip = () => updateProfile({ [step.key]: undefined } as Partial<UserProfile>);

  const goNext = () => {
    if (i < total - 1) setI(i + 1);
    else navigate({ to: "/results" });
  };
  const goBack = () => {
    if (i > 0) setI(i - 1);
  };

  const canProceed = currentValue !== "" || true; // always allow (skip supported)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t(lang, "step")} {i + 1} {t(lang, "of")} {total}
            </span>
            <Link to="/" className="hover:text-primary">{t(lang, "restart")}</Link>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
            {t(lang, step.qKey)}
          </h2>

          <div className="mt-6">
            {step.kind === "select" && step.options && (
              step.options.length > 6 ? (
                <Select value={currentValue} onValueChange={handleChoice}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {step.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {step.key === "state" ? o.labelKey : t(lang, o.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {step.options.map((o) => {
                    const active = currentValue === o.value;
                    return (
                      <button
                        key={o.value}
                        onClick={() => handleChoice(o.value)}
                        className={`rounded-lg border p-4 text-left text-base transition ${
                          active
                            ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                            : "border-border bg-background hover:border-primary/40 hover:bg-accent"
                        }`}
                      >
                        {t(lang as LangCode, o.labelKey)}
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {step.kind === "number" && (
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={step.min}
                  max={step.max}
                  value={currentValue}
                  onChange={(e) => handleChoice(e.target.value)}
                  className="h-12 text-lg"
                />
                {step.suffix && (
                  <span className="text-sm text-muted-foreground">{step.suffix}</span>
                )}
              </div>
            )}

            {step.kind === "yesno" && (
              <div className="grid grid-cols-2 gap-2">
                {["yes", "no"].map((v) => {
                  const active = currentValue === v;
                  return (
                    <button
                      key={v}
                      onClick={() => handleChoice(v)}
                      className={`rounded-lg border p-4 text-base font-medium transition ${
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                          : "border-border bg-background hover:border-primary/40 hover:bg-accent"
                      }`}
                    >
                      {t(lang, v === "yes" ? "yes" : "no")}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={skip}
            className="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <HelpCircle className="h-4 w-4" />
            {t(lang, "dont_know")}
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" onClick={goBack} disabled={i === 0} className="h-12">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t(lang, "back")}
          </Button>
          <Button
            onClick={goNext}
            disabled={!canProceed}
            className="h-12 bg-saffron px-6 text-saffron-foreground hover:bg-saffron/90"
          >
            {i === total - 1 ? t(lang, "see_results") : t(lang, "next")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
      <HelpFooter />
    </div>
  );
}
