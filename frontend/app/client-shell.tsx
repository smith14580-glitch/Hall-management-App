"use client";

import { useEffect, useState } from "react";
import { I18nProvider } from "@/lib/i18n";
import Topbar from "@/components/topbar";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<"en" | "ur">("en");
  useEffect(() => {
    const saved = (localStorage.getItem("marque_lang") as "en" | "ur" | null) ?? "en";
    setLang(saved);
    const el = document.documentElement;
    el.lang = saved;
    el.dir = saved === "ur" ? "rtl" : "ltr";
  }, []);
  return (
    <I18nProvider initialLang={lang}>
      <Topbar />
      <main className="flex-1 p-4">{children}</main>
    </I18nProvider>
  );
}
