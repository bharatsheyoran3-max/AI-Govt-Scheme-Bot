import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { HelpFooter } from "@/components/HelpFooter";
import { useSession } from "@/lib/session";
import { t, type LangCode } from "@/lib/i18n";
import { SCHEMES, DOC_LABELS } from "@/lib/schemes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, ExternalLink, FileText, Gift, MapPin, 
  HelpCircle, CheckCircle, Info, ShieldCheck, Phone, MessageSquare 
} from "lucide-react";

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

const DOC_GUIDE_MAP: Record<string, { definition: string; location: string }> = {
  aadhaar: {
    definition: "National 12-digit identity card containing biometric details.",
    location: "Aadhaar enrollment centers or download via uidai.gov.in using linked mobile."
  },
  bank: {
    definition: "First page of your bank passbook showing account number and IFSC code.",
    location: "Issued by your local bank branch upon opening an account."
  },
  income: {
    definition: "Official state government certificate verifying yearly family earnings.",
    location: "Apply online via state e-District portal or visit the local Tehsildar/Revenue office."
  },
  caste: {
    definition: "Certificate proving SC, ST, OBC, or EWS community classification.",
    location: "Issued by the local Sub-Divisional Magistrate (SDM) or Tehsildar office."
  },
  land: {
    definition: "Farmland registration record (7/12 extract, Khatauni, or Patta document).",
    location: "Obtain from the village Patwari / Lekhpal or check state land record websites."
  },
  ration: {
    definition: "Food supply log card issued to family units (AAY, BPL, or APL categories).",
    location: "Issued by the District Food and Civil Supplies controller office."
  },
  age: {
    definition: "Official proof of age, such as birth certificate or secondary school mark sheet.",
    location: "Municipal birth registrar or school board registry office."
  },
  disability: {
    definition: "Medical certificate confirming 40% or more physical/mental handicap.",
    location: "Obtain from authorized medical board of a government hospital or via udidcard.gov.in."
  },
  photo: {
    definition: "Recent color passport-sized portrait photograph.",
    location: "Any photography studio or digital camera printout."
  },
  mobile: {
    definition: "Active telephone number registered in UIDAI Aadhaar registry.",
    location: "Visit nearest Aadhaar enrollment point to link and activate your phone number."
  },
  school: {
    definition: "Enrolment ID card, fee receipt, or certificate from educational institution.",
    location: "Obtain from registrar/clerk office of your school, college, or university."
  }
};

function pickLang<T>(dict: Partial<Record<LangCode, T>>, lang: LangCode): T | undefined {
  return dict[lang] ?? dict.en;
}

function linkify(text: string) {
  if (!text) return "";
  const urlRegex = /(\b[a-z0-9.-]+\.(?:gov\.in|nic\.in|org|com)\b)/gi;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const url = part.startsWith("http") ? part : `https://${part}`;
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
        >
          {part} <ExternalLink className="h-3.5 w-3.5 inline" />
        </a>
      );
    }
    return part;
  });
}

function SchemeDetail() {
  const { schemeId } = Route.useLoaderData();
  const { lang, userId } = useSession();
  const scheme = SCHEMES.find((s) => s.id === schemeId)!;
  
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [verifiedDocs, setVerifiedDocs] = useState<Record<string, boolean>>({});
  
  // Modal states for DigiLocker simulation
  const [showDigiModal, setShowDigiModal] = useState(false);
  const [digiStep, setDigiStep] = useState<"init" | "otp" | "success">("init");
  const [digiOtp, setDigiOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Guidance expansion state
  const [activeGuide, setActiveGuide] = useState<string | null>(null);

  const startDigiLocker = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/document/digilocker-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectUrl: window.location.href })
      });
      if (res.ok) {
        setDigiStep("otp");
      } else {
        throw new Error("Could not start authorization.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyDigiLocker = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch verified docs from backend
      const res = await fetch("/api/v1/document/digilocker-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "mock_auth_code_" + digiOtp,
          transactionId: "11111111-2222-3333-4444-555555555555" // Sample UUID
        })
      });

      if (!res.ok) {
        throw new Error("Incorrect DigiLocker OTP.");
      }

      const data = await res.json();
      
      // Auto-check documents matching types fetched from backend
      const dlDocs = data.documents;
      const updatedChecked = { ...checked };
      const updatedVerified = { ...verifiedDocs };

      dlDocs.forEach((doc: any) => {
        // Map backend code to client document ID
        let matchedId = "";
        if (doc.type === "AADHAAR") matchedId = "aadhaar";
        else if (doc.type === "INCOME") matchedId = "income";
        else if (doc.type === "RATION") matchedId = "ration";

        if (matchedId && scheme.documents.includes(matchedId)) {
          updatedChecked[matchedId] = true;
          updatedVerified[matchedId] = true;
        }
      });

      setChecked(updatedChecked);
      setVerifiedDocs(updatedVerified);
      setDigiStep("success");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" className="mb-4 -ml-3 h-10 border border-border/40">
          <Link to="/results"><ArrowLeft className="mr-2 h-4 w-4" /> {t(lang, "back")}</Link>
        </Button>

        <div className="rounded-2xl bg-hero p-6 text-primary-foreground shadow-elevated">
          <div className="text-xs font-bold uppercase tracking-wide text-primary-foreground/75">
            {scheme.ministry}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
            {pickLang(scheme.name, lang)}
          </h1>
          <p className="mt-2 text-primary-foreground/90 leading-relaxed text-sm">
            {pickLang(scheme.summary, lang)}
          </p>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-primary">
              <Gift className="h-5 w-5 shrink-0" />
              <h2 className="font-display text-base font-semibold">{t(lang, "benefit")}</h2>
            </div>
            <p className="mt-2 text-sm text-foreground leading-relaxed">{pickLang(scheme.benefit, lang)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="h-5 w-5 shrink-0" />
              <h2 className="font-display text-base font-semibold">{t(lang, "where_to_apply")}</h2>
            </div>
            <p className="mt-2 text-sm text-foreground leading-relaxed">{linkify(pickLang(scheme.whereToApply, lang) || "")}</p>
            <a
              href={scheme.sourceUrl}
              target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline focus:ring-2 focus:ring-primary rounded p-1"
            >
              {t(lang, "source")} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>

        {/* Document Checklist & DigiLocker Gate */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="h-5 w-5" />
              <h2 className="font-display text-base font-semibold">{t(lang, "documents_needed")}</h2>
            </div>
            
            {/* DigiLocker Button (Mock Integration) */}
            <Button
              onClick={() => { setShowDigiModal(true); setDigiStep("init"); }}
              className="bg-primary hover:bg-primary/95 text-primary-foreground gap-1.5 h-10 text-xs font-bold w-full sm:w-auto"
            >
              <ShieldCheck className="h-4 w-4" /> Link DigiLocker
            </Button>
          </div>

          <ul className="mt-4 space-y-3">
            {scheme.documents.map((docId) => {
              const label = pickLang(DOC_LABELS[docId] ?? {}, lang) ?? docId;
              const isChecked = !!checked[docId];
              const isVerified = !!verifiedDocs[docId];
              const guide = DOC_GUIDE_MAP[docId];

              return (
                <li key={docId} className="space-y-2">
                  <div
                    className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
                      isVerified
                        ? "border-success bg-success/5 shadow-sm"
                        : isChecked
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-background hover:bg-accent/40"
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(v) => {
                        if (!isVerified) {
                          setChecked((c) => ({ ...c, [docId]: !!v }));
                        }
                      }}
                      disabled={isVerified}
                      className="h-5 w-5"
                      id={`check-${docId}`}
                    />
                    <label
                      htmlFor={`check-${docId}`}
                      className={`text-sm font-semibold cursor-pointer select-none flex-grow ${
                        isVerified ? "text-success" : "text-foreground"
                      }`}
                    >
                      {label}
                    </label>

                    <div className="flex items-center gap-2 shrink-0">
                      {isVerified ? (
                        <Badge className="bg-success text-success-foreground gap-1 border-none font-semibold text-xs py-1">
                          <CheckCircle className="h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground font-semibold">
                          {isChecked ? t(lang, "doc_have") : t(lang, "doc_missing")}
                        </span>
                      )}
                      
                      <button
                        onClick={() => setActiveGuide(activeGuide === docId ? null : docId)}
                        aria-expanded={activeGuide === docId}
                        aria-label="View instructions on how to obtain this file"
                        className="text-primary hover:bg-primary/10 p-1.5 rounded-full"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {activeGuide === docId && guide && (
                    <div className="ml-8 border-l-2 border-primary/20 bg-muted/65 p-3 rounded-r-xl space-y-1.5 text-xs text-muted-foreground animate-in fade-in duration-200">
                      <p className="leading-relaxed">
                        <strong className="text-foreground">What is this:</strong> {guide.definition}
                      </p>
                      <p className="leading-relaxed">
                        <strong className="text-foreground">Where to get it:</strong> {guide.location}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Human Escalation Option - Always Visible Section */}
        <section className="mt-6 rounded-2xl border border-success/30 bg-success/5 p-5">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-success animate-pulse" /> Need Help With Applications?
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Need help retrieving documents or filling out applications? Contact a verified Common Service Centre operator instantly.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`https://wa.me/911800110001?text=Hello%2C%20I%20am%20using%20SchemeSathi%20and%20need%20help%20obtaining%20documents%20for%20the%20${encodeURIComponent(pickLang(scheme.name, lang))}%20scheme.`}
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

      {/* DigiLocker Sim Modal */}
      <Dialog open={showDigiModal} onOpenChange={setShowDigiModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-display text-lg font-bold">
              <ShieldCheck className="h-6 w-6 text-primary" /> DigiLocker Secure Access
            </DialogTitle>
          </DialogHeader>

          {digiStep === "init" && (
            <div className="space-y-4 py-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect your official DigiLocker account to automatically fetch, verify, and check off eligible documents without manually uploading files.
              </p>
              <ul className="text-xs text-muted-foreground space-y-2 bg-accent p-3.5 rounded-xl border border-border">
                <li className="flex gap-2">✔ Access caste, income, and Aadhaar files</li>
                <li className="flex gap-2">✔ Logged secure data sharing consent</li>
                <li className="flex gap-2">✔ No sensitive raw files stored locally</li>
              </ul>
              <Button onClick={startDigiLocker} className="w-full bg-saffron text-saffron-foreground font-bold hover:bg-saffron/90 h-11" disabled={loading}>
                {loading ? "Authorizing..." : "Link DigiLocker"}
              </Button>
            </div>
          )}

          {digiStep === "otp" && (
            <div className="space-y-4 py-3">
              <p className="text-sm text-muted-foreground">
                Please enter the 6-digit verification code sent to your Aadhaar-registered mobile number:
              </p>
              <Input
                type="text"
                placeholder="Enter 6-digit Code (Try: 1234)"
                value={digiOtp}
                onChange={(e) => setDigiOtp(e.target.value)}
                className="h-12 border-primary/30 text-center font-bold text-xl tracking-widest max-w-[220px] mx-auto"
              />
              {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
              <Button onClick={verifyDigiLocker} className="w-full bg-primary text-primary-foreground font-bold h-11" disabled={loading}>
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
            </div>
          )}

          {digiStep === "success" && (
            <div className="space-y-4 py-3 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/20 text-success">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h4 className="font-display font-bold text-foreground text-lg">Documents Linked!</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We successfully linked your Aadhaar Card, Income Certificate, and Ration Card. Verified documents are marked on your checklist.
              </p>
              <Button onClick={() => setShowDigiModal(false)} className="w-full bg-primary text-primary-foreground h-11 font-bold">
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <HelpFooter />
    </div>
  );
}
