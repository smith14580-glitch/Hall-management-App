"use client";

import React from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { isConnectionError } from "@/lib/api";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-gold", className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-md bg-stone-200/80", className)} aria-hidden="true" />;
}

export function LoadingState({ message }: { message?: string }) {
  const { t } = useLanguage();
  const label = message || t("loading");
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line" role="status" aria-label={label}>
      <div className="mb-5 flex items-center gap-3">
        <span className="relative grid h-8 w-8 shrink-0 place-items-center" aria-hidden="true">
          <span className="loader-orbit absolute inset-0 rounded-full" />
          <span className="font-display text-xs font-bold text-gold">M</span>
        </span>
        <p className="text-sm font-semibold text-ink/70">{label}</p>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="mt-3 h-7 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-line" aria-hidden="true">
      <div className="border-b border-stone-line px-5 py-4">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y divide-stone-line">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-5 py-4">
            {Array.from({ length: cols }).map((__, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-xl bg-white p-10 text-center text-sm text-ink/60 shadow-sm">
      {message || t("noData")}
    </div>
  );
}

export function ConnectionError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useLanguage();
  const connection = isConnectionError(error);
  const message =
    error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-800">
            {connection ? t("connectionTitle") : "Error"}
          </p>
          <p className="mt-1 break-words text-sm text-red-700">{message}</p>
          {connection && (
            <p className="mt-1 text-xs text-red-600">{t("connectionBody")}</p>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            <RefreshCw className="h-4 w-4" />
            {t("retry")}
          </button>
        </div>
      </div>
    </div>
  );
}

type BadgeTone = "green" | "amber" | "red" | "grey" | "blue" | "gold";

const TONES: Record<BadgeTone, string> = {
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  grey: "bg-stone-200 text-stone-700",
  blue: "bg-sky-100 text-sky-800",
  gold: "bg-gold-light text-gold-dark",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[tone])}>
      {children}
    </span>
  );
}

export function bookingStatusTone(status: string): BadgeTone {
  switch (status) {
    case "confirmed":
      return "green";
    case "pending":
      return "amber";
    case "cancelled":
      return "red";
    case "completed":
      return "blue";
    default:
      return "grey";
  }
}

export function paymentStatusTone(status: string): BadgeTone {
  switch (status) {
    case "fully_paid":
      return "green";
    case "partially_paid":
      return "amber";
    case "unpaid":
      return "red";
    default:
      return "grey";
  }
}

export function slotTone(status: string): BadgeTone {
  // Calendar uses only two colours: green = free, red = booked/held.
  return status === "available" ? "green" : "red";
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <span className="mb-2 block h-1 w-12 rounded-full bg-gradient-to-r from-gold to-gold-dark" aria-hidden />
        <h1 className="font-display text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

type StatTone = "light" | "dark" | "gold";

const STAT_TONES: Record<StatTone, { card: string; label: string; value: string; icon: string; sub: string }> = {
  light: {
    card: "bg-gradient-to-br from-white to-offwhite ring-stone-line",
    label: "text-ink/50",
    value: "text-charcoal",
    icon: "text-gold",
    sub: "text-ink/50",
  },
  dark: {
    card: "bg-gradient-to-br from-charcoal to-charcoal-light ring-white/10",
    label: "text-white/60",
    value: "text-white",
    icon: "text-gold",
    sub: "text-white/50",
  },
  gold: {
    card: "bg-gradient-to-br from-gold-light via-gold to-gold-dark ring-gold-dark/30",
    label: "text-charcoal/70",
    value: "text-charcoal",
    icon: "text-charcoal",
    sub: "text-charcoal/60",
  },
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "light",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  tone?: StatTone;
}) {
  const style = STAT_TONES[tone];
  return (
    <div
      className={cn(
        "rounded-xl p-3 shadow-sm ring-1 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5",
        style.card,
      )}
    >
      <div className="flex items-start justify-between gap-1 sm:gap-2">
        <p className={cn("text-[10px] font-semibold uppercase tracking-wide sm:text-xs", style.label)}>{label}</p>
        {icon && <span className={cn("shrink-0", style.icon)}>{icon}</span>}
      </div>
      <p className={cn("mt-2 break-words font-display text-lg font-bold leading-tight sm:text-2xl", style.value)}>{value}</p>
      {sub && <p className={cn("mt-1 text-[10px] sm:text-xs", style.sub)}>{sub}</p>}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gold/30 bg-charcoal px-5 py-4">
          <h2 className="font-display text-lg font-bold text-white">
            <span className="me-2 text-gold" aria-hidden>◆</span>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xl leading-none text-white/60 hover:bg-white/10 hover:text-gold"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-stone-line bg-white px-3 py-2.5 text-sm text-charcoal shadow-sm outline-none transition hover:border-gold/60 focus:border-gold focus:ring-2 focus:ring-gold/30";

export const labelClass = "mb-1.5 block text-sm font-semibold text-charcoal";

export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-charcoal px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-charcoal-light hover:shadow-lg disabled:opacity-50";

export const goldButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal shadow-[0_6px_16px_rgba(217,154,54,0.28)] transition hover:-translate-y-px hover:bg-gold-dark hover:text-white hover:shadow-[0_10px_22px_rgba(217,154,54,0.35)] disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-line bg-white px-4 py-2.5 text-sm font-semibold text-charcoal shadow-sm transition hover:border-gold/60 hover:bg-offwhite hover:text-gold-dark disabled:opacity-50";

export const dangerButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50";
