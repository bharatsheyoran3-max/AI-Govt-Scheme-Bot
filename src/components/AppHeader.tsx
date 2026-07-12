import { Link } from "@tanstack/react-router";
import { useSession, setLang } from "@/lib/session";
import { LANGUAGES, t, type LangCode } from "@/lib/i18n";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function AppHeader() {
  const { lang } = useSession();
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
    </header>
  );
}
