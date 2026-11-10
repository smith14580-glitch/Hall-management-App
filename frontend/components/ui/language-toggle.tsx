"use client";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, t, setLang } = useTranslation();
  return (
    <div className="flex items-center gap-1 border border-input rounded-md px-1">
      <Button
        variant={lang === "en" ? "default" : "outline"}
        size="sm"
        onClick={() => setLang("en")}
        className="text-xs px-2 py-1.5"
      >
        {t("english")}
      </Button>
      <Button
        variant={lang === "ur" ? "default" : "outline"}
        size="sm"
        onClick={() => setLang("ur")}
        className="text-xs px-2 py-1.5"
      >
        {t("urdu")}
      </Button>
    </div>
  );
}
