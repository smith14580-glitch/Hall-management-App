"use client";

import React, { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { fetchAvailability, fetchBookings } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { formatDate, formatPKR } from "@/lib/format";
import type { AvailabilityDay, Booking } from "@/lib/types";
import {
  Badge,
  bookingStatusTone,
  ConnectionError,
  goldButtonClass,
  LoadingState,
  PageHeader,
  secondaryButtonClass,
  slotTone,
} from "@/components/ui";
import { cn } from "@/lib/format";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const { t } = useLanguage();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [dayLoading, setDayLoading] = useState(false);

  const key = monthKey(cursor);

  // Data loading lives in an Effect Event: effects may call it, and it
  // always sees the latest state without re-running the effect.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDays(await fetchAvailability(key));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [key, load]);

  const openDay = async (date: string) => {
    setSelected(date);
    setDayLoading(true);
    try {
      setDayBookings(await fetchBookings({ event_date: date }));
    } catch {
      setDayBookings([]);
    } finally {
      setDayLoading(false);
    }
  };

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = cursor.toLocaleString("en-GB", { month: "long", year: "numeric" });
  const dayMap = new Map(days.map((d) => [d.date, d]));

  const cells: Array<{ date: string; day: AvailabilityDay | null; blank?: boolean }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ date: `blank-${i}`, day: null, blank: true });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date, day: dayMap.get(date) || null });
  }

  const shift = (delta: number) => setCursor(new Date(year, month + delta, 1));

  return (
    <div>
      <PageHeader
        title={t("calendar")}
        subtitle="Day aur Night alag slots hain — ek hi date par dono book ho sakte hain."
        actions={
          <Link href="/bookings/new" data-requires-auth className={goldButtonClass}>
            <Plus className="h-4 w-4" /> {t("newBooking")}
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="green">Free / Available</Badge>
        <Badge tone="red">Booked</Badge>
      </div>

      {error ? (
        <ConnectionError error={error} onRetry={() => void load()} />
      ) : loading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={() => shift(-1)} className={secondaryButtonClass} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="font-display text-xl font-bold text-charcoal">{monthName}</h2>
              <button type="button" onClick={() => shift(1)} className={secondaryButtonClass} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink/50 sm:gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2" role="grid" aria-label={monthName}>
              {cells.map((cell) => {
                if (cell.blank) return <div key={cell.date} className="min-h-16 sm:min-h-20" />;
                const dayNum = Number(cell.date.slice(-2));
                const isSelected = selected === cell.date;
                const dayBooked = cell.day?.day.status === "booked" || cell.day?.day.status === "pending";
                const nightBooked = cell.day?.night.status === "booked" || cell.day?.night.status === "pending";
                const dateBooked = dayBooked || nightBooked;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => openDay(cell.date)}
                    className={cn(
                      "flex min-h-16 flex-col items-start gap-1 rounded-lg border-2 p-1.5 text-left transition-colors sm:min-h-20 sm:p-2",
                      dateBooked
                        ? "border-red-500 bg-red-100 hover:bg-red-200"
                        : "border-emerald-500 bg-emerald-100 hover:bg-emerald-200",
                      isSelected && "ring-2 ring-charcoal ring-offset-1",
                    )}
                    aria-label={`Bookings for ${cell.date}`}
                  >
                    <span className="text-sm font-bold text-charcoal">{dayNum}</span>
                    <span className="flex flex-col gap-1 sm:flex-row">
                      <span
                        className={cn(
                          "rounded px-1 py-0.5 text-[10px] font-bold leading-none text-white",
                          dayBooked ? "bg-red-600" : "bg-emerald-600",
                        )}
                      >
                        D
                      </span>
                      <span
                        className={cn(
                          "rounded px-1 py-0.5 text-[10px] font-bold leading-none text-white",
                          nightBooked ? "bg-red-600" : "bg-emerald-600",
                        )}
                      >
                        N
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-ink/50">D = Day slot (12:00–16:00) · N = Night slot (19:00–23:00). Default timings — Settings me change ho sakte hain.</p>
          </div>

          <div className="h-fit rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-bold text-charcoal">
              {selected ? formatDate(selected) : "Select a date"}
            </h2>
            {!selected ? (
              <p className="mt-3 text-sm text-ink/60">Calendar me kisi date par click karo — us din ki bookings aur slot status yahan dikhega.</p>
            ) : dayLoading ? (
              <LoadingState />
            ) : (
              <>
                {(() => {
                  const info = dayMap.get(selected);
                  return info ? (
                    <div className="mt-3 flex gap-2">
                      <Badge tone={slotTone(info.day.status)}>Day: {info.day.status === "available" ? "Free" : "Booked"}</Badge>
                      <Badge tone={slotTone(info.night.status)}>Night: {info.night.status === "available" ? "Free" : "Booked"}</Badge>
                    </div>
                  ) : null;
                })()}
                {dayBookings.length === 0 ? (
                  <p className="mt-4 text-sm text-ink/60">Is date par koi booking nahi hai.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {dayBookings.map((b) => (
                      <li key={b.id} className="rounded-lg border border-stone-line p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Link href={`/bookings/${b.id}`} className="text-sm font-bold text-charcoal hover:underline">
                            {b.booking_code}
                          </Link>
                          <Badge tone={bookingStatusTone(b.status)}>{b.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-ink/60">
                          {b.customer_name} · {b.event_type} · {b.slot} · {formatPKR(b.total_price)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href={`/bookings/new?date=${selected}`} data-requires-auth className={`${goldButtonClass} mt-4 w-full`}>
                  <Plus className="h-4 w-4" /> Is Date Par Booking Karein
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
