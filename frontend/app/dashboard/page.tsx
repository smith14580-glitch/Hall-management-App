"use client";

import { useTranslation } from "@/lib/i18n";

export default function DashboardPage() {
  const { t } = useTranslation();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t("dashboard")}</h1>
      <p className="text-muted-foreground mt-2">{t("app_name")} — Phase 2 foundation.</p>
    </div>
  );
}
