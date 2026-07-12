import { Link } from "@tanstack/react-router";
import { useSession, setLang } from "@/lib/session";
import { LANGUAGES, t, type LangCode } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { Contrast } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function AppHeader() {
  const { lang } = useSession();
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHighContrast(document.body.classList.contains("accessibility-high-contrast"));
    }
  }, []);

  const toggleHighContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    if (next) {
      document.body.classList.add("accessibility-high-contrast");
      window.localStorage.setItem("schemesathi.highcontrast", "true");
    } else {
      document.body.classList.remove("accessibility-high-contrast");
      window.localStorage.setItem("schemesathi.highcontrast", "false");
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-hero text-primary-foreground shadow-card">
            <span className="text-lg font-bold">श</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold text-primary">
              {t(lang, "app_name")}
            </div>
            <div className="hidden text-xs text-muted-foreground sm:block">
              {t(lang, "app_tag")}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleHighContrast}
            aria-label="Toggle high contrast mode"
            title="Toggle high contrast mode"
            className="h-11 w-[44px] shrink-0"
          >
            <Contrast className="h-5 w-5" />
          </Button>
          <Select value={lang} onValueChange={(v) => setLang(v as LangCode)}>
            <SelectTrigger className="h-11 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  <span className="font-medium">{l.native}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{l.english}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
