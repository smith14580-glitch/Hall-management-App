"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { fetchBookingsPage } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { formatDate, formatPKR } from "@/lib/format";
import type { Booking } from "@/lib/types";
import {
  Badge,
  bookingStatusTone,
  ConnectionError,
  EmptyState,
  goldButtonClass,
  inputClass,
  LoadingState,
  PageHeader,
  paymentStatusTone,
  secondaryButtonClass,
} from "@/components/ui";

const PAGE_SIZE = 20;

export default function BookingsPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [slot, setSlot] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBookingsPage({
        search: search || undefined,
        status: status || undefined,
        payment_status: paymentStatus || undefined,
        slot: slot || undefined,
        event_date: date || undefined,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      setRows(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [search, status, paymentStatus, slot, date, page]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <PageHeader
        title={t("bookings")}
        subtitle="Search by customer name, phone, booking ID, date or status."
        actions={
          <Link href="/bookings/new" data-requires-auth className={goldButtonClass}>
            <Plus className="h-4 w-4" /> {t("newBooking")}
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Name, phone, booking ID…"
            className={`${inputClass} ps-9`}
            aria-label={t("search")}
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className={inputClass} aria-label={t("status")}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
        <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(0); }} className={inputClass} aria-label={t("paymentStatus")}>
          <option value="">All payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="fully_paid">Fully Paid</option>
        </select>
        <div className="flex gap-2">
          <select value={slot} onChange={(e) => { setSlot(e.target.value); setPage(0); }} className={inputClass} aria-label={t("slot")}>
            <option value="">Day + Night</option>
            <option value="day">Day</option>
            <option value="night">Night</option>
          </select>
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(0); }} className={inputClass} aria-label={t("eventDate")} />
        </div>
      </div>

      {error ? (
        <ConnectionError error={error} onRetry={load} />
      ) : loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState message="No bookings match these filters. Try a different search." />
      ) : (
        <>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
          <table className="w-full min-w-200 text-left text-sm">
            <thead>
              <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                <th className="px-5 py-3">Booking</th>
                <th className="px-5 py-3">{t("customer")}</th>
                <th className="px-5 py-3">{t("eventType")}</th>
                <th className="px-5 py-3">{t("eventDate")}</th>
                <th className="px-5 py-3">{t("slot")}</th>
                <th className="px-5 py-3">{t("total")}</th>
                <th className="px-5 py-3">{t("balance")}</th>
                <th className="px-5 py-3">{t("paymentStatus")}</th>
                <th className="px-5 py-3">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                  <td className="px-5 py-3 font-semibold text-charcoal">
                    <Link href={`/bookings/${b.id}`} className="hover:underline">{b.booking_code}</Link>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-charcoal">{b.customer_name || "—"}</p>
                    <p className="text-xs text-ink/60">{b.customer_phone || ""}</p>
                  </td>
                  <td className="px-5 py-3">{b.event_type}</td>
                  <td className="px-5 py-3">{formatDate(b.event_date)}</td>
                  <td className="px-5 py-3 capitalize">{b.slot}</td>
                  <td className="px-5 py-3">{formatPKR(b.total_price)}</td>
                  <td className="px-5 py-3 font-semibold text-red-700">{formatPKR(b.balance_amount)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={paymentStatusTone(b.payment_status)}>{b.payment_status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={bookingStatusTone(b.status)}>{b.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink/60">
            {total === 0
              ? "No bookings"
              : `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={(page + 1) * PAGE_SIZE >= total}
              onClick={() => setPage((p) => p + 1)}
              className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Next
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
