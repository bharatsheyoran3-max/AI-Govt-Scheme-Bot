import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { HelpFooter } from "@/components/HelpFooter";
import { useSession, updateProfile } from "@/lib/session";
import { t, type LangCode } from "@/lib/i18n";
import { INDIAN_STATES, type UserProfile } from "@/lib/schemes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, HelpCircle, Volume2, Mic, MicOff, Info, CheckCircle } from "lucide-react";

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

const GUIDANCE_MAP: Record<string, string> = {
  state: "Select the state of your primary residence where you have local addresses. Check your voter ID card.",
  age: "Look at your birth certificate, secondary school certificate, or the front of your Aadhaar card for your birth year.",
  income: "Total earnings of all family members in a year. Refer to your income certificate issued by the Tehsildar or municipal authority.",
  occupation: "Choose what represents your main source of income. Select 'Farmer' if you grow crops on own/rented land.",
  land: "Refer to your land registration or 7/12 extract papers. Small farmers own less than 2 acres of farmland.",
  ration: "Identify the color/label of your ration card. BPL is below poverty line. Antyodaya (AAY) cards are usually yellow.",
  category: "Check your caste certificate. EWS stands for Economically Weaker Section of general category.",
  familySize: "Total number of relatives living in the same home and eating from the same kitchen registration.",
};

const transliterateLatin = (text: string, lang: string): string => {
  if (lang !== "hi" && lang !== "mr") return text;
  const mappings: Record<string, string> = {
    up: "उत्तर प्रदेश",
    uttar: "उत्तर",
    pradesh: "प्रदेश",
    bihar: "बिहार",
    delhi: "दिल्ली",
    maharashtra: "महाराष्ट्र",
    goa: "गोवा",
    gujarat: "गुजरात",
    punjab: "पंजाब",
    haryana: "हरियाणा",
    rajasthan: "राजस्थान",
    bengal: "बंगाल",
    kerala: "केरल",
    assam: "असम",
    karnataka: "कर्नाटक"
  };
  let result = text.toLowerCase();
  for (const [key, value] of Object.entries(mappings)) {
    result = result.replace(new RegExp(`\\b${key}\\b`, "g"), value);
  }
  return result;
};

function Questionnaire() {
  const { lang, profile, userId } = useSession();
  const navigate = useNavigate();
  
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const total = STEPS.length;
  const progress = useMemo(() => Math.round(((i + 1) / total) * 100), [i, total]);

  // Guidance card state
  const [showGuidance, setShowGuidance] = useState(false);

  // ASR State
  const [isListening, setIsListening] = useState(false);

  // e-KYC Import confirmation modal (No silent data actions)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedProfile, setImportedProfile] = useState<Partial<UserProfile> | null>(null);

  // State search input for easy transliteration
  const [stateSearch, setStateSearch] = useState("");

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

  const skip = () => {
    updateProfile({ [step.key]: undefined } as Partial<UserProfile>);
    goNext();
  };

  const getNextStepIndex = (currIndex: number, currProfile: UserProfile) => {
    let nextIndex = currIndex + 1;
    while (nextIndex < total) {
      const nextStep = STEPS[nextIndex];
      // Branching logic: Skip land details if not a farmer
      if (nextStep.key === "land" && currProfile.occupation !== "farmer") {
        nextIndex++;
        continue;
      }
      break;
    }
    return nextIndex;
  };

  const getPreviousStepIndex = (currIndex: number, currProfile: UserProfile) => {
    let prevIndex = currIndex - 1;
    while (prevIndex >= 0) {
      const prevStep = STEPS[prevIndex];
      // Branching logic: Skip land details if not a farmer
      if (prevStep.key === "land" && currProfile.occupation !== "farmer") {
        prevIndex--;
        continue;
      }
      break;
    }
    return prevIndex;
  };

  const goNext = () => {
    const nextIdx = getNextStepIndex(i, profile);
    if (nextIdx < total) {
      setI(nextIdx);
      setShowGuidance(false);
    } else {
      navigate({ to: "/results" });
    }
  };

  const goBack = () => {
    const prevIdx = getPreviousStepIndex(i, profile);
    if (prevIdx >= 0) {
      setI(prevIdx);
      setShowGuidance(false);
    }
  };

  // Text-To-Speech (TTS) synthesizer
  const handleTtsPlay = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Read the question and active choice
    const questionText = t(lang, step.qKey);
    let optionsText = "";
    if (step.options) {
      optionsText = "Options are: " + step.options.map(o => t(lang, o.labelKey)).join(", ");
    } else if (step.kind === "yesno") {
      optionsText = "Options are: Yes, or No.";
    }

    const speakString = `${questionText}. ${optionsText}`;
    const utterance = new SpeechSynthesisUtterance(speakString);
    const locales: Record<string, string> = {
      en: "en-IN", hi: "hi-IN", bn: "bn-IN", ta: "ta-IN", te: "te-IN", mr: "mr-IN"
    };
    utterance.lang = locales[lang] || "en-IN";
    window.speechSynthesis.speak(utterance);
  };

  // Speech Recognition (ASR)
  const handleAsrToggle = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    const locales: Record<string, string> = {
      en: "en-IN", hi: "hi-IN", bn: "bn-IN", ta: "ta-IN", te: "te-IN", mr: "mr-IN"
    };
    recognition.lang = locales[lang] || "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      if (step.kind === "number") {
        const match = resultText.match(/\d+/);
        if (match) {
          handleChoice(match[0]);
        }
      } else {
        handleChoice(resultText);
      }
    };

    recognition.start();
  };

  // e-KYC demo integration (Demonstrating security and no silent auto-fill)
  const triggerEkycVerify = async () => {
    // Simulated fetch from server endpoint
    const response = await fetch("/api/v1/document/ekyc-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: "123456", trackingId: userId })
    });
    if (response.ok) {
      const data = await response.json();
      // Setup profile update candidates
      const extracted: Partial<UserProfile> = {
        gender: data.demographics.gender,
        state: data.demographics.state,
        age: 61 // Mocked age based on DOB
      };
      setImportedProfile(extracted);
      setShowImportModal(true); // Open gate modal - NO SILENT ACTIONS
    }
  };

  const confirmImport = () => {
    if (importedProfile) {
      updateProfile(importedProfile);
    }
    setShowImportModal(false);
    setImportedProfile(null);
  };

  const canProceed = currentValue !== "";

  // Auto-speak questions when moving to a new step
  useEffect(() => {
    handleTtsPlay();
  }, [i]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8" role="main" aria-label="Scheme Questionnaire Form">
        
        {/* e-KYC Demo Trigger Banner */}
        {i === 0 && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold block text-foreground">Verify using secure e-KYC?</span>
                <span className="text-muted-foreground block mt-0.5 text-xs">Uses authorized channel to retrieve state/age/gender without silent submits.</span>
              </div>
            </div>
            <Button size="sm" onClick={triggerEkycVerify} className="h-9 bg-primary text-primary-foreground">
              Verify
            </Button>
          </div>
        )}

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t(lang, "step")} {i + 1} {t(lang, "of")} {total}
            </span>
            <Link to="/" className="hover:text-primary transition font-medium focus:ring-2 focus:ring-primary">
              {t(lang, "restart")}
            </Link>
          </div>
          <Progress value={progress} className="h-2" aria-label="Questionnaire Progress" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card relative">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl" id="question-label">
              {t(lang, step.qKey)}
            </h2>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="icon"
                onClick={handleTtsPlay}
                aria-label="Listen to question read aloud"
                title="Listen to question"
                className="h-10 w-10 text-primary border-primary/30"
              >
                <Volume2 className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="mt-6" aria-labelledby="question-label">
            {step.kind === "select" && step.options && (
              step.options.length > 6 ? (
                <div className="space-y-3">
                  {step.key === "state" && (
                    <Input
                      placeholder="Type state (e.g. up, bihar)..."
                      value={stateSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStateSearch(val);
                        const translit = transliterateLatin(val, lang);
                        const matchedState = INDIAN_STATES.find(
                          s => s.toLowerCase().startsWith(translit.toLowerCase()) || s.toLowerCase().includes(translit.toLowerCase())
                        );
                        if (matchedState) {
                          handleChoice(matchedState);
                        }
                      }}
                      className="h-12 border-primary/30 focus:border-primary text-base"
                      aria-label="Search and select your state"
                    />
                  )}
                  <Select value={currentValue} onValueChange={handleChoice}>
                    <SelectTrigger className="h-12 border-border text-base focus:ring-2 focus:ring-primary">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {step.options
                        .filter(o => !stateSearch || o.value.toLowerCase().includes(stateSearch.toLowerCase()))
                        .map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-base py-3">
                            {step.key === "state" ? o.labelKey : t(lang, o.labelKey)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {step.options.map((o) => {
                    const active = currentValue === o.value;
                    return (
                      <button
                        key={o.value}
                        onClick={() => handleChoice(o.value)}
                        className={`rounded-xl border p-5 text-left text-base font-medium transition-all ${
                          active
                            ? "border-primary bg-primary/5 ring-2 ring-primary"
                            : "border-border bg-background hover:border-primary/45 hover:bg-accent"
                        }`}
                        aria-pressed={active}
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
                  className="h-12 text-lg border-primary/30 max-w-[200px]"
                  aria-label="Enter number details"
                />
                {step.suffix && (
                  <span className="text-base text-muted-foreground">{step.suffix}</span>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAsrToggle}
                  aria-label={isListening ? "Stop voice listening" : "Listen to speech input"}
                  title="Speech-to-text input"
                  className={`h-12 w-12 shrink-0 ${isListening ? "bg-red-500 text-white animate-pulse" : "text-primary"}`}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
              </div>
            )}

            {step.kind === "yesno" && (
              <div className="grid grid-cols-2 gap-3">
                {["yes", "no"].map((v) => {
                  const active = currentValue === v;
                  return (
                    <button
                      key={v}
                      onClick={() => handleChoice(v)}
                      className={`rounded-xl border p-5 text-lg font-bold text-center transition-all ${
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "border-border bg-background hover:border-primary/45 hover:bg-accent"
                      }`}
                      aria-pressed={active}
                    >
                      {t(lang, v === "yes" ? "yes" : "no")}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowGuidance(!showGuidance)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline self-start focus:ring-2 focus:ring-primary rounded"
              aria-expanded={showGuidance}
            >
              <HelpCircle className="h-4 w-4" />
              {t(lang, "dont_know")}
            </button>

            {showGuidance && (
              <div className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <h4 className="font-display font-semibold text-sm text-foreground flex items-center gap-1">
                  <Info className="h-4 w-4" /> Help Guidance
                </h4>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {GUIDANCE_MAP[step.key] || "Please check your official identity details or ration logs."}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" onClick={goBack} disabled={i === 0} className="h-12 px-5 text-base border-border">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t(lang, "back")}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={skip} className="h-12 text-base text-muted-foreground hover:text-foreground">
              Skip
            </Button>
            <Button
              onClick={goNext}
              disabled={!canProceed}
              className="h-12 bg-saffron px-6 text-saffron-foreground font-bold text-base shadow-elevated hover:bg-saffron/90"
            >
              {i === total - 1 ? t(lang, "see_results") : t(lang, "next")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>

      {/* No Silent Data Actions confirmation Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <CheckCircle className="h-5 w-5 text-success animate-bounce" /> Confirm Retrieved Information
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              We securely retrieved the following data from Aadhaar e-KYC. Please confirm before we apply it:
            </p>
            {importedProfile && (
              <ul className="space-y-2 rounded-xl bg-accent p-4 text-sm font-medium border border-border">
                <li className="flex justify-between border-b border-border/50 pb-2">
                  <span>State:</span> <span className="text-foreground">{importedProfile.state}</span>
                </li>
                <li className="flex justify-between border-b border-border/50 pb-2">
                  <span>Age:</span> <span className="text-foreground">{importedProfile.age} years old</span>
                </li>
                <li className="flex justify-between">
                  <span>Gender:</span> <span className="text-foreground capitalize">{importedProfile.gender}</span>
                </li>
              </ul>
            )}
            <p className="text-xs text-red-500 italic">
              * Verification token matches only the last 4 digits. Full Aadhaar details are never stored.
            </p>
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
            <Button onClick={confirmImport} className="bg-saffron text-saffron-foreground font-bold hover:bg-saffron/90">
              Confirm & Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HelpFooter />
    </div>
  );
}
