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
  return <div className={cn("animate-pulse rounded-md bg-stone-200/80", className)} aria-hidden="true" />;
}

export function LoadingState({ message }: { message?: string }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line" role="status" aria-label={message || t("loading")}>
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <span className="sr-only">{message || t("loading")}</span>
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
  switch (status) {
    case "booked":
      return "red";
    case "pending":
      return "amber";
    case "available":
      return "green";
    default:
      return "grey";
  }
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
        <h1 className="font-display text-2xl font-bold text-charcoal sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</p>
        {icon && <span className="text-gold">{icon}</span>}
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-charcoal">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink/50">{sub}</p>}
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
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-stone-line px-5 py-4">
          <h2 className="font-display text-lg font-bold text-charcoal">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xl leading-none text-ink/60 hover:bg-offwhite hover:text-charcoal"
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
  "w-full rounded-lg border border-stone-line bg-white px-3 py-2.5 text-sm text-charcoal outline-none focus:border-gold focus:ring-2 focus:ring-gold/30";

export const labelClass = "mb-1.5 block text-sm font-semibold text-charcoal";

export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-charcoal px-5 py-2.5 text-sm font-semibold text-white hover:bg-charcoal-light disabled:opacity-50";

export const goldButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal hover:bg-gold-dark hover:text-white disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-line bg-white px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-offwhite disabled:opacity-50";

export const dangerButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50";
