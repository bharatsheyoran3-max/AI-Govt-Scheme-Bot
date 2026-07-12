import { useSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { LifeBuoy } from "lucide-react";

export function HelpFooter() {
  const { lang } = useSession();
  return (
    <footer className="mt-16 border-t border-border bg-secondary/60">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-8 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <LifeBuoy className="h-5 w-5" />
            <span className="font-display font-semibold">{t(lang, "need_help")}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t(lang, "helpline")}</p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(lang, "disclaimer")}
        </p>
      </div>
    </footer>
  );
}
