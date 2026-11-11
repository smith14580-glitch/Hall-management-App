"use client";

import React, { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
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
  fetchBookingPayments,
  fetchBookings,
  fetchDashboardSummary,
  fetchRevenue,
  fetchTodaysBookings,
  fetchUpcomingBookings,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { formatDate, formatPKR, todayISO } from "@/lib/format";
import type { Booking, DashboardSummary, Payment, RevenuePoint } from "@/lib/types";
import {
  Badge,
  bookingStatusTone,
  ConnectionError,
  EmptyState,
  goldButtonClass,
  inputClass,
  LoadingState,
  Modal,
  PageHeader,
  paymentStatusTone,
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
  return `Advance abhi due hai — ${balance}`;
}

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
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Booking[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [alertDate, setAlertDate] = useState<string | null>(null);
  const [alertBookings, setAlertBookings] = useState<Booking[]>([]);
  const [alertPayments, setAlertPayments] = useState<Record<string, Payment[]>>({});
  const [alertLoading, setAlertLoading] = useState(false);

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

  // Debounced dashboard search (customer, phone, booking code, date…).
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

  const openAlert = async (date: string) => {
    setAlertDate(date);
    setAlertLoading(true);
    setAlertBookings([]);
    setAlertPayments({});
    try {
      const rows = await fetchBookings({ event_date: date });
      setAlertBookings(rows);
      const entries = await Promise.all(
        rows.map(async (b) => {
          const payments = await fetchBookingPayments(b.id).catch(() => [] as Payment[]);
          return [b.id, payments] as const;
        }),
      );
      setAlertPayments(Object.fromEntries(entries));
    } finally {
      setAlertLoading(false);
    }
  };

  if (authLoading || !(isManager || isDemo)) return <LoadingState />;

  const upcomingAlerts = [...upcoming]
    .sort(
      (a, b) =>
        a.event_date.localeCompare(b.event_date) || a.slot.localeCompare(b.slot),
    )
    .slice(0, 8);

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
                  {heroIsToday ? "AAJ KA EVENT" : "AGLA EVENT"} · {heroBooking.slot === "day" ? "DAY" : "NIGHT"} SLOT
                </p>
                <h2 className="max-w-3xl break-words font-display text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
                  {heroBooking.customer_name || "—"} — {heroBooking.event_type},{" "}
                  {heroIsToday
                    ? `aaj ${slotClock(heroBooking.slot)}`
                    : `${shortDate(heroBooking.event_date)}, ${slotClock(heroBooking.slot)}`}
                </h2>
                <p className="max-w-2xl text-sm text-white/80 sm:text-base">
                  {heroBooking.guest_count} guests · {heroBooking.tables_required} tables allocated · {paymentLine(heroBooking)}
                </p>
                {otherToday.length > 0 && (
                  <p className="text-xs font-semibold text-gold-light sm:text-sm">
                    Aaj {todaySorted.length} events hain — {todaySorted.map((b) => (b.slot === "day" ? "Day 12:00" : "Night 7:00")).join(", ")}
                  </p>
                )}
                <span className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-gold">
                  View booking <span aria-hidden>→</span>
                </span>
              </div>
            </Link>
          ) : (
            <div className="mb-6 rounded-xl border-s-4 border-gold bg-gold-light/70 px-4 py-3 text-sm font-semibold text-charcoal ring-1 ring-gold/30">
              Koi upcoming event nahi hai — New Booking se pehli booking banayein.
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
                  {t("search")}: “{search.trim()}”
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
                            <p className="font-medium text-charcoal">{b.customer_name || "—"}</p>
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

          {upcomingAlerts.length > 0 && (
            <div className="mt-6 rounded-xl border-s-4 border-gold bg-gold-light/70 p-4 shadow-sm ring-1 ring-gold/30" role="status">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-charcoal">
                    {t("calendarAlert")} — {t("calendarAlertHint")}
                  </p>
                  <p className="mt-1 text-xs text-ink/60">{t("alertHintClick")}</p>
                  <ul className="mt-3 space-y-2">
                    {upcomingAlerts.map((b) => (
                      <li key={`${b.id}-${b.slot}`}>
                        <button
                          type="button"
                          onClick={() => void openAlert(b.event_date)}
                          className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2.5 text-start ring-1 ring-stone-line transition-colors hover:ring-gold"
                        >
                          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-charcoal">
                            <CalendarDays className="h-4 w-4 text-gold-dark" />
                            {formatDate(b.event_date)}
                            <Badge tone={b.slot === "day" ? "green" : "red"}>
                              {b.slot === "day" ? t("day") : t("night")}
                            </Badge>
                            <span className="text-xs font-medium text-ink/60">
                              {b.customer_name || "—"} · {b.event_type} · {b.booking_code}
                            </span>
                          </span>
                          <span className="text-xs font-bold text-gold-dark">{t("viewRecord")} →</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

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
                              {b.customer_name || "—"} — {b.event_type}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink/60">
                              <span>{b.slot === "day" ? t("day") : t("night")} slot · {b.guest_count} guests ·</span>
                              <Badge tone={bookingStatusTone(b.status)}>{b.status}</Badge>
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
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

      {alertDate && (
        <Modal title={`${formatDate(alertDate)} — ${t("completeRecord")}`} onClose={() => setAlertDate(null)}>
          {alertLoading ? (
            <LoadingState />
          ) : alertBookings.length === 0 ? (
            <EmptyState message={t("noData")} />
          ) : (
            <div className="space-y-4">
              {alertBookings.map((b) => (
                <div key={b.id} className="rounded-lg border border-stone-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-base font-bold text-charcoal">{b.booking_code}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={bookingStatusTone(b.status)}>{b.status}</Badge>
                      <Badge tone={paymentStatusTone(b.payment_status)}>{b.payment_status.replace("_", " ")}</Badge>
                      <Badge tone={b.slot === "day" ? "green" : "red"}>
                        {b.slot === "day" ? t("day") : t("night")}
                      </Badge>
                    </div>
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-ink/50">{t("customer")}</dt><dd className="font-semibold text-charcoal">{b.customer_name || "—"}</dd></div>
                    <div><dt className="text-ink/50">{t("phone")}</dt><dd className="font-semibold text-charcoal" dir="ltr">{b.customer_phone || "—"}</dd></div>
                    <div><dt className="text-ink/50">{t("eventType")}</dt><dd className="font-semibold text-charcoal">{b.event_type}</dd></div>
                    <div><dt className="text-ink/50">{t("eventDate")}</dt><dd className="font-semibold text-charcoal">{formatDate(b.event_date)}</dd></div>
                    <div><dt className="text-ink/50">{t("guests")} / {t("tables")}</dt><dd className="font-semibold text-charcoal">{b.guest_count} · {b.tables_required}</dd></div>
                    <div><dt className="text-ink/50">{t("total")}</dt><dd className="font-semibold text-charcoal">{formatPKR(b.total_price)}</dd></div>
                    <div><dt className="text-ink/50">{t("paid")}</dt><dd className="font-semibold text-emerald-700">{formatPKR(b.amount_paid)}</dd></div>
                    <div><dt className="text-ink/50">{t("balance")}</dt><dd className="font-semibold text-red-700">{formatPKR(b.balance_amount)}</dd></div>
                  </dl>
                  {b.special_instructions && (
                    <p className="mt-2 rounded-lg bg-offwhite px-3 py-2 text-xs text-ink/60">{b.special_instructions}</p>
                  )}
                  <h3 className="mt-3 text-xs font-bold uppercase tracking-wide text-ink/50">{t("paymentHistory")}</h3>
                  {(alertPayments[b.id] ?? []).length === 0 ? (
                    <p className="mt-1 text-xs text-ink/60">{t("noPayments")}</p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-xs">
                      {(alertPayments[b.id] ?? []).map((p) => (
                        <li
                          key={p.id}
                          className={`flex justify-between gap-2 border-b border-stone-line py-1 last:border-0 ${p.is_voided ? "text-ink/40 line-through" : "text-charcoal"}`}
                        >
                          <span>
                            {p.receipt_number} · {formatDate(p.payment_date)} · {p.method.replace("_", " ")}
                          </span>
                          <span className="font-semibold">{formatPKR(p.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link href={`/bookings/${b.id}`} className={`${goldButtonClass} mt-3`}>
                    {t("openBooking")} →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
