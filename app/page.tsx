"use client";

import React, { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CalendarDays,
  CalendarPlus,
  Clock,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import { fetchDashboardSummary, fetchRevenue, fetchTodaysBookings, fetchUpcomingBookings } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { formatDate, formatPKR } from "@/lib/format";
import type { Booking, DashboardSummary, RevenuePoint } from "@/lib/types";
import {
  Badge,
  bookingStatusTone,
  ConnectionError,
  goldButtonClass,
  LoadingState,
  PageHeader,
  secondaryButtonClass,
  StatCard,
} from "@/components/ui";

function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const max = Math.max(...points.map((p) => p.revenue), 1);
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
      <h2 className="font-display text-lg font-bold text-charcoal">Revenue — last 6 months</h2>
      <div className="mt-5 flex h-44 items-end gap-3" role="img" aria-label="Revenue bar chart">
        {points.map((p) => (
          <div key={p.label} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-[11px] font-semibold text-ink/60">{formatPKR(p.revenue)}</span>
            <div
              className="w-full max-w-12 rounded-t-lg bg-gold"
              style={{ height: `${Math.max(6, (p.revenue / max) * 110)}px` }}
              title={`${p.label}: ${formatPKR(p.revenue)}`}
            />
            <span className="text-xs font-semibold text-ink/60">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isManager, isDemo } = useAuth();
  const { t } = useLanguage();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [today, setToday] = useState<Booking[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  // Data loading lives in an Effect Event: effects may call it, and it
  // always sees the latest state without re-running the effect.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r, u, td] = await Promise.all([
        fetchDashboardSummary(),
        fetchRevenue("monthly"),
        fetchUpcomingBookings(),
        fetchTodaysBookings(),
      ]);
      setSummary(s);
      setRevenue(r);
      setUpcoming(u);
      setToday(td);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && !isManager) router.replace("/attendance");
  }, [authLoading, user, isManager, router]);

  useEffect(() => {
    if (authLoading || !(isManager || isDemo)) return;
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [authLoading, isManager, isDemo, load]);

  if (authLoading || !(isManager || isDemo)) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title={t("dashboard")}
        subtitle={
          user
            ? `Welcome back, ${user.full_name} — aaj ka kaam yahan se dekho.`
            : t("demoViewBanner")
        }
        actions={
          <Link href="/bookings/new" data-requires-auth className={goldButtonClass}>
            <Plus className="h-4 w-4" /> {t("newBooking")}
          </Link>
        }
      />

      {error ? (
        <ConnectionError error={error} onRetry={() => void load()} />
      ) : loading || !summary ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label={t("totalBookings")} value={String(summary.total_bookings)} icon={<CalendarDays className="h-5 w-5" />} />
            <StatCard label={t("todaysEvents")} value={String(summary.todays_events)} icon={<Clock className="h-5 w-5" />} />
            <StatCard label={t("upcomingWeddings")} value={String(summary.upcoming_weddings)} icon={<CalendarPlus className="h-5 w-5" />} />
            <StatCard label={t("totalRevenue")} value={formatPKR(summary.total_revenue)} icon={<Banknote className="h-5 w-5" />} />
            <StatCard label={t("outstanding")} value={formatPKR(summary.outstanding_payments)} icon={<Wallet className="h-5 w-5" />} />
            <StatCard label={t("amountReceived")} value={formatPKR(summary.amount_received)} icon={<Wallet className="h-5 w-5" />} />
            <StatCard label={t("confirmed")} value={String(summary.confirmed_bookings)} sub={`${summary.pending_bookings} ${t("pending")}`} />
            <StatCard label={t("totalEmployees")} value={String(summary.total_employees)} icon={<Users className="h-5 w-5" />} />
            <StatCard label={t("todaysAttendance")} value={String(summary.todays_attendance)} icon={<Clock className="h-5 w-5" />} />
            <div className="rounded-xl bg-charcoal p-5 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{t("quickActions")}</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/bookings/new" data-requires-auth className="rounded-lg bg-gold px-3 py-2 text-center text-sm font-semibold text-charcoal hover:bg-gold-dark hover:text-white">
                  {t("newBooking")}
                </Link>
                <Link href="/payments" className="rounded-lg bg-white/10 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-white/20">
                  {t("payments")}
                </Link>
                <Link href="/attendance" className="rounded-lg bg-white/10 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-white/20">
                  {t("attendance")}
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <RevenueChart points={revenue} />
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line lg:col-span-2">
              <h2 className="font-display text-lg font-bold text-charcoal">{t("upcomingEvents")}</h2>
              {upcoming.length === 0 ? (
                <p className="mt-4 text-sm text-ink/60">{t("noData")}</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {upcoming.slice(0, 5).map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 border-b border-stone-line pb-3 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-charcoal">
                          {b.customer_name || b.customer_id} · {b.event_type}
                        </p>
                        <p className="text-xs text-ink/60">
                          {formatDate(b.event_date)} · {b.slot === "day" ? t("day") : t("night")} · {b.booking_code}
                        </p>
                      </div>
                      <Badge tone={bookingStatusTone(b.status)}>{b.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/calendar" className={`${secondaryButtonClass} mt-4 w-full`}>
                {t("calendar")}
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
            <div className="flex items-center justify-between border-b border-stone-line px-5 py-4">
              <h2 className="font-display text-lg font-bold text-charcoal">{t("recentBookings")}</h2>
              <Link href="/bookings" className="text-sm font-semibold text-gold-dark hover:underline">
                {t("view")} →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-150 text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                    <th className="px-5 py-3">Booking</th>
                    <th className="px-5 py-3">{t("customer")}</th>
                    <th className="px-5 py-3">{t("eventDate")}</th>
                    <th className="px-5 py-3">{t("slot")}</th>
                    <th className="px-5 py-3">{t("total")}</th>
                    <th className="px-5 py-3">{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.slice(0, 6).map((b) => (
                    <tr key={b.id} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                      <td className="px-5 py-3 font-semibold text-charcoal">
                        <Link href={`/bookings/${b.id}`} className="hover:underline">{b.booking_code}</Link>
                      </td>
                      <td className="px-5 py-3">{b.customer_name || "—"}</td>
                      <td className="px-5 py-3">{formatDate(b.event_date)}</td>
                      <td className="px-5 py-3 capitalize">{b.slot}</td>
                      <td className="px-5 py-3">{formatPKR(b.total_price)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={bookingStatusTone(b.status)}>{b.status}</Badge>
                      </td>
                    </tr>
                  ))}
                  {upcoming.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-ink/60">{t("noData")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {today.length > 0 && (
              <p className="border-t border-stone-line px-5 py-3 text-xs text-ink/60">
                Aaj ke events: {today.map((b) => `${b.booking_code} (${b.slot})`).join(", ")}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
