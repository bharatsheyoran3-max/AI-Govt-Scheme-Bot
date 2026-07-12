import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { HelpFooter } from "@/components/HelpFooter";
import { useSession, setLang, updateProfile, resetSession } from "@/lib/session";
import { LANGUAGES, t, type LangCode } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  ArrowRight, CheckCircle2, FileCheck2, Languages, 
  ShieldCheck, Mic, MicOff, Search, HelpCircle, CheckCircle, Info 
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

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

function Index() {
  const { lang, userId } = useSession();
  const navigate = useNavigate();

  // Search input state
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);

  // NLU extract verification modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [extractedFields, setExtractedFields] = useState<any>(null);

  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    const locales: Record<string, string> = {
      en: "en-IN", hi: "hi-IN", bn: "bn-IN", ta: "ta-IN", te: "te-IN", mr: "mr-IN"
    };
    rec.lang = locales[lang] || "en-IN";
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      handleSearch(transcript);
    };

    rec.start();
  };

  const handleSearch = async (queryText: string) => {
    const text = queryText || searchQuery;
    if (!text.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/v1/nlu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text })
      });

      if (!response.ok) throw new Error("NLU failed");

      const data = await response.json();
      const extracted = data.analysis.extractedProfile;

      if (Object.keys(extracted).length > 0) {
        // Show confirmation before saving (No silent data actions)
        setExtractedFields(extracted);
        setShowConfirmModal(true);
      } else {
        // Just go to questionnaire consent
        navigate({ to: "/consent" });
      }
    } catch (err) {
      console.warn("NLU offline or failed. Proceed to consent.");
      navigate({ to: "/consent" });
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = () => {
    if (extractedFields) {
      // Clear previous details and populate NLU fields
      resetSession();
      updateProfile(extractedFields);
      // Auto-set screening consent to true since user is fast-tracking
      updateProfile({ state: extractedFields.state });
    }
    setShowConfirmModal(false);
    navigate({ to: "/consent" });
  };

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

            {/* Conversational NLU Search Container */}
            <div className="mt-8 bg-card text-foreground p-3.5 rounded-2xl shadow-elevated flex flex-col sm:flex-row gap-2 max-w-lg border border-border">
              <div className="flex items-center flex-grow gap-2 relative bg-accent rounded-xl px-3 h-12 border border-border/50">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <Input
                  type="text"
                  placeholder="e.g. Help for small farmers or kheti..."
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    const translit = transliterateLatin(val, lang);
                    setSearchQuery(translit);
                  }}
                  className="bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base h-full w-full"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startListening}
                  className={`h-9 w-9 rounded-lg shrink-0 ${isListening ? "bg-red-500 text-white animate-pulse" : "text-primary hover:bg-primary/10"}`}
                  aria-label={isListening ? "Stop voice listening" : "Start voice speech input"}
                >
                  <Mic className="h-4.5 w-4.5" />
                </Button>
              </div>
              <Button
                onClick={() => handleSearch("")}
                disabled={loading}
                className="h-12 bg-saffron text-saffron-foreground font-bold hover:bg-saffron/90 rounded-xl px-5 text-base"
              >
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-primary-foreground/75 font-semibold">
              <HelpCircle className="h-4 w-4" />
              <span>Or click start below to fill the guided checklist step-by-step.</span>
            </div>

            <div className="mt-6">
              <Button asChild size="lg" className="h-12 bg-saffron px-6 text-saffron-foreground shadow-elevated hover:bg-saffron/90 font-bold">
                <Link to="/consent">
                  {t(lang, "start")} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Language picker card */}
          <div className="rounded-2xl bg-card p-5 text-card-foreground shadow-elevated border border-border">
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
                    aria-pressed={active}
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

      {/* No Silent Data Actions Import Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <CheckCircle className="h-5 w-5 text-success" /> Confirm Extracted Search Intent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our NLU parser extracted the following details from your voice/text query. Confirm if you want to pre-fill them:
            </p>
            {extractedFields && (
              <ul className="space-y-2 rounded-xl bg-accent p-4 text-sm font-medium border border-border">
                {extractedFields.occupation && (
                  <li className="flex justify-between border-b border-border/50 pb-2">
                    <span>Occupation:</span> <span className="text-foreground capitalize">{extractedFields.occupation}</span>
                  </li>
                )}
                {extractedFields.age && (
                  <li className="flex justify-between border-b border-border/50 pb-2">
                    <span>Age:</span> <span className="text-foreground">{extractedFields.age} years old</span>
                  </li>
                )}
                {extractedFields.income && (
                  <li className="flex justify-between border-b border-border/50 pb-2">
                    <span>Income:</span> <span className="text-foreground">₹{extractedFields.income}</span>
                  </li>
                )}
                {extractedFields.gender && (
                  <li className="flex justify-between">
                    <span>Gender:</span> <span className="text-foreground capitalize">{extractedFields.gender}</span>
                  </li>
                )}
              </ul>
            )}
            <p className="text-xs text-muted-foreground italic">
              These will pre-populate the checklist steps. You can edit them at any stage.
            </p>
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Discard</Button>
            <Button onClick={confirmImport} className="bg-saffron text-saffron-foreground font-bold hover:bg-saffron/90">
              Confirm & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HelpFooter />
    </div>
  );
}
