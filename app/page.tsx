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
  Search,
  Users,
  Wallet,
} from "lucide-react";
import {
  fetchBookings,
  fetchDashboardSummary,
  fetchRevenue,
  fetchTodaysBookings,
  fetchUpcomingBookings,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { formatDate, formatPKR, todayISO } from "@/lib/format";
import type { Booking, DashboardSummary, RevenuePoint } from "@/lib/types";
import {
  Badge,
  bookingStatusTone,
  ConnectionError,
  EmptyState,
  goldButtonClass,
  inputClass,
  LoadingState,
  PageHeader,
  secondaryButtonClass,
  StatCard,
} from "@/components/ui";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function dateParts(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month: MONTHS_SHORT[(month || 1) - 1] ?? "", day: day || 0 };
}

function shortDate(dateStr: string) {
  const { day, month } = dateParts(dateStr);
  return day && month ? `${day} ${month}` : dateStr;
}

function slotClock(slot: string) {
  return slot === "day" ? "dopahar 12:00 bajay" : "raat 7:00 bajay";
}

function paymentLine(b: Booking) {
  const balance = formatPKR(b.balance_amount);
  if (b.payment_status === "fully_paid") return "Advance received, poori payment mil gayi hai";
  if (b.payment_status === "partially_paid") return `Advance received, balance ${balance} event se pehle due hai`;
  return `Advance abhi due hai â€” ${balance}`;
}

function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const max = Math.max(...points.map((p) => p.revenue), 1);
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
      <h2 className="font-display text-lg font-bold text-charcoal">Revenue â€” last 6 months</h2>
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
  const [latest, setLatest] = useState<Booking[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Booking[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Data loading lives in an Effect Event: effects may call it, and it
  // always sees the latest state without re-running the effect.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r, u, td, all] = await Promise.all([
        fetchDashboardSummary(),
        fetchRevenue("monthly"),
        fetchUpcomingBookings(),
        fetchTodaysBookings(),
        fetchBookings(),
      ]);
      setSummary(s);
      setRevenue(r);
      setUpcoming(u);
      setToday(td);
      setLatest([...all].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 5));
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

  // Debounced dashboard search (customer, phone, booking code, dateâ€¦).
  useEffect(() => {
    const q = search.trim();
    const id = window.setTimeout(async () => {
      if (!q) {
        setSearchResults(null);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      try {
        setSearchResults(await fetchBookings({ search: q }));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [search]);

  if (authLoading || !(isManager || isDemo)) return <LoadingState />;

  const upcomingDates = [...new Set(upcoming.map((b) => b.event_date))]
    .sort()
    .map((date) => {
      const dayBookings = upcoming.filter((b) => b.event_date === date && b.slot === "day");
      const nightBookings = upcoming.filter((b) => b.event_date === date && b.slot === "night");
      return {
        date,
        hasDay: dayBookings.length > 0,
        hasNight: nightBookings.length > 0,
        conflict: upcoming.filter((b) => b.event_date === date).length > 1,
      };
    });

  const todaySorted = [...today].sort((a, b) => a.slot.localeCompare(b.slot));
  const nextUpcoming = [...upcoming]
    .filter((b) => b.event_date > todayISO())
    .sort(
      (a, b) =>
        a.event_date.localeCompare(b.event_date) || a.slot.localeCompare(b.slot),
    );
  const heroBooking = todaySorted[0] ?? nextUpcoming[0] ?? null;
  const heroIsToday = todaySorted.length > 0;
  const otherToday = heroIsToday ? todaySorted.slice(1) : [];

  return (
    <div>
      <PageHeader
        title={t("dashboard")}
        subtitle={
          user
            ? `Welcome back, ${user.full_name} â€” aaj ka kaam yahan se dekho.`
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
          {heroBooking ? (
            <Link
              href={`/bookings/${heroBooking.id}`}
              className="group relative mb-6 block overflow-hidden rounded-2xl bg-charcoal shadow-md ring-1 ring-charcoal/10"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.02]"
                style={{ backgroundImage: "url('/images/hall-hero.jpg')" }}
                aria-hidden
              />
              <div className="absolute inset-0 bg-charcoal/55" aria-hidden />
              <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/45 to-transparent" aria-hidden />
              <div className="relative flex flex-col gap-3 p-6 sm:p-8 lg:p-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gold">
                  {heroIsToday ? "AAJ KA EVENT" : "AGLA EVENT"} Â· {heroBooking.slot === "day" ? "DAY" : "NIGHT"} SLOT
                </p>
                <h2 className="max-w-3xl break-words font-display text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
                  {heroBooking.customer_name || "â€”"} â€” {heroBooking.event_type},{" "}
                  {heroIsToday
                    ? `aaj ${slotClock(heroBooking.slot)}`
                    : `${shortDate(heroBooking.event_date)}, ${slotClock(heroBooking.slot)}`}
                </h2>
                <p className="max-w-2xl text-sm text-white/80 sm:text-base">
                  {heroBooking.guest_count} guests Â· {heroBooking.tables_required} tables allocated Â· {paymentLine(heroBooking)}
                </p>
                {otherToday.length > 0 && (
                  <p className="text-xs font-semibold text-gold-light sm:text-sm">
                    Aaj {todaySorted.length} events hain â€” {todaySorted.map((b) => (b.slot === "day" ? "Day 12:00" : "Night 7:00")).join(", ")}
                  </p>
                )}
                <span className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-gold">
                  View booking <span aria-hidden>â†’</span>
                </span>
              </div>
            </Link>
          ) : (
            <div className="mb-6 rounded-xl border-s-4 border-gold bg-gold-light/70 px-4 py-3 text-sm font-semibold text-charcoal ring-1 ring-gold/30">
              Koi upcoming event nahi hai â€” New Booking se pehli booking banayein.
            </div>
          )}

          <div className="relative mb-5 max-w-xl">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchDashboard")}
              className={`${inputClass} ps-9`}
              aria-label={t("search")}
            />
          </div>

          {search.trim() !== "" && (
            <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold text-charcoal">
                  {t("search")}: —{search.trim()}â€
                </h2>
                <button type="button" onClick={() => setSearch("")} className={secondaryButtonClass}>
                  {t("cancel")}
                </button>
              </div>
              {searchLoading ? (
                <LoadingState />
              ) : (searchResults ?? []).length === 0 ? (
                <EmptyState message={t("noData")} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-150 text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                        <th className="px-3 py-2">Booking</th>
                        <th className="px-3 py-2">{t("customer")}</th>
                        <th className="px-3 py-2">{t("eventDate")}</th>
                        <th className="px-3 py-2">{t("slot")}</th>
                        <th className="px-3 py-2">{t("total")}</th>
                        <th className="px-3 py-2">{t("status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(searchResults ?? []).map((b) => (
                        <tr key={b.id} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                          <td className="px-3 py-2.5 font-semibold">
                            <Link href={`/bookings/${b.id}`} className="text-gold-dark hover:underline">
                              {b.booking_code}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-charcoal">{b.customer_name || "â€”"}</p>
                            <p className="text-xs text-ink/60" dir="ltr">{b.customer_phone || ""}</p>
                          </td>
                          <td className="px-3 py-2.5">{formatDate(b.event_date)}</td>
                          <td className="px-3 py-2.5 capitalize">{b.slot}</td>
                          <td className="px-3 py-2.5">{formatPKR(b.total_price)}</td>
                          <td className="px-3 py-2.5">
                            <Badge tone={bookingStatusTone(b.status)}>{b.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard tone="gold" label={t("totalBookings")} value={String(summary.total_bookings)} icon={<CalendarDays className="h-5 w-5" />} />
            <StatCard tone="dark" label={t("todaysEvents")} value={String(summary.todays_events)} icon={<Clock className="h-5 w-5" />} />
            <StatCard tone="gold" label={t("upcomingWeddings")} value={String(summary.upcoming_weddings)} icon={<CalendarPlus className="h-5 w-5" />} />
            <StatCard tone="dark" label={t("totalRevenue")} value={formatPKR(summary.total_revenue)} icon={<Banknote className="h-5 w-5" />} />
            <StatCard tone="light" label={t("outstanding")} value={formatPKR(summary.outstanding_payments)} icon={<Wallet className="h-5 w-5" />} />
            <StatCard tone="dark" label={t("amountReceived")} value={formatPKR(summary.amount_received)} icon={<Wallet className="h-5 w-5" />} />
            <StatCard tone="gold" label={t("confirmed")} value={String(summary.confirmed_bookings)} sub={`${summary.pending_bookings} ${t("pending")}`} />
            <StatCard tone="light" label={t("totalEmployees")} value={String(summary.total_employees)} icon={<Users className="h-5 w-5" />} />
            <StatCard tone="light" label={t("todaysAttendance")} value={String(summary.todays_attendance)} icon={<Clock className="h-5 w-5" />} />
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
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {upcomingDates.map((d) => {
                      const { day, month } = dateParts(d.date);
                      return (
                        <div
                          key={d.date}
                          className="flex items-center gap-1.5 rounded-lg border border-stone-line bg-offwhite px-2.5 py-1.5 text-xs font-semibold text-charcoal"
                        >
                          <span className="font-display text-sm font-bold leading-none">{day}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wide text-gold-dark">{month}</span>
                          {d.hasDay && <Badge tone="green">{t("day")}</Badge>}
                          {d.hasNight && <Badge tone="red">{t("night")}</Badge>}
                          {d.conflict && <span className="h-2 w-2 rounded-full bg-amber-500" title="Multiple bookings" />}
                        </div>
                      );
                    })}
                  </div>
                  <ul className="mt-4 space-y-3">
                    {upcoming.slice(0, 5).map((b) => {
                    const { day, month } = dateParts(b.event_date);
                    return (
                      <li key={b.id} className="border-b border-stone-line pb-3 last:border-0 last:pb-0">
                        <Link
                          href={`/bookings/${b.id}`}
                          className="flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-offwhite"
                        >
                          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-charcoal text-white">
                            <span className="font-display text-base font-bold leading-none">{day}</span>
                            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-gold">{month}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-charcoal">
                              {b.customer_name || "â€”"} â€” {b.event_type}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink/60">
                              <span>{b.slot === "day" ? t("day") : t("night")} slot Â· {b.guest_count} guests Â·</span>
                              <Badge tone={bookingStatusTone(b.status)}>{b.status}</Badge>
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                </>
              )}
              <Link href="/calendar" className={`${secondaryButtonClass} mt-4 w-full`}>
                {t("calendar")}
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
            <div className="flex items-center justify-between border-b border-stone-line px-5 py-4">
              <h2 className="font-display text-lg font-bold text-charcoal">{t("latestBookings")}</h2>
              <Link href="/bookings" className="text-sm font-semibold text-gold-dark hover:underline">
                {t("view")} â†’
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
                  {latest.map((b) => (
                    <tr key={b.id} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                      <td className="px-5 py-3 font-semibold text-charcoal">
                        <Link href={`/bookings/${b.id}`} className="hover:underline">{b.booking_code}</Link>
                      </td>
                      <td className="px-5 py-3">{b.customer_name || "â€”"}</td>
                      <td className="px-5 py-3">{formatDate(b.event_date)}</td>
                      <td className="px-5 py-3 capitalize">{b.slot}</td>
                      <td className="px-5 py-3">{formatPKR(b.total_price)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={bookingStatusTone(b.status)}>{b.status}</Badge>
                      </td>
                    </tr>
                  ))}
                  {latest.length === 0 && (
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
