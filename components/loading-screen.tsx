"use client";

import { cn } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

export function LoadingScreen({
  fullPage = false,
  className,
}: {
  fullPage?: boolean;
  className?: string;
}) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 bg-charcoal px-6 text-center text-white",
        fullPage ? "min-h-screen" : "min-h-80 rounded-xl",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={t("loading")}
    >
      <div className="relative grid h-20 w-20 place-items-center" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border border-gold/20" />
        <span className="loader-halo absolute inset-2 rounded-full bg-gold/10" />
        <span className="loader-orbit absolute inset-0 rounded-full" />
        <span className="relative font-display text-3xl font-bold text-gold">M</span>
      </div>

      <div>
        <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-white/90">
          MARQUE <span className="text-gold">ONE</span>
        </p>
        <p className="mt-2 text-xs tracking-wide text-white/50">{t("loading")}</p>
      </div>

      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <span className="loader-shimmer block h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-gold to-transparent" />
      </div>
    </div>
  );
}
