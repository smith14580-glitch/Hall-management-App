"use client";

import React, { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchCustomer, fetchCustomerBookings, fetchCustomerSummary } from "@/lib/api";
import { formatDate, formatPKR } from "@/lib/format";
import type { Booking, Customer, CustomerSummary } from "@/lib/types";
import {
  Badge,
  bookingStatusTone,
  ConnectionError,
  EmptyState,
  LoadingState,
  PageHeader,
  secondaryButtonClass,
  StatCard,
} from "@/components/ui";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Data loading lives in an Effect Event: effects may call it, and it
  // always sees the latest state without re-running the effect.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, b, s] = await Promise.all([
        fetchCustomer(id),
        fetchCustomerBookings(id).catch(() => [] as Booking[]),
        fetchCustomerSummary(id).catch(() => null),
      ]);
      setCustomer(c);
      setBookings(b);
      setSummary(s);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [id, load]);

  if (loading) return <LoadingState />;
  if (error || !customer) {
    return (
      <div>
        <PageHeader title="Customer" />
        <ConnectionError error={error || new Error("Customer nahi mila.")} onRetry={() => void load()} />
        <button type="button" onClick={() => router.push("/customers")} className={`${secondaryButtonClass} mt-4`}>
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => router.push("/customers")} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-dark hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </button>
      <PageHeader title={customer.full_name} subtitle={`Phone: ${customer.phone}`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Bookings" value={String(summary?.total_bookings ?? bookings.length)} />
        <StatCard label="Total Paid" value={formatPKR(summary?.total_paid ?? bookings.reduce((s, b) => s + b.amount_paid, 0))} />
        <StatCard label="Outstanding" value={formatPKR(summary?.total_outstanding ?? bookings.reduce((s, b) => s + b.balance_amount, 0))} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
          <h2 className="font-display text-lg font-bold text-charcoal">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-ink/50">Phone</dt><dd className="font-semibold text-charcoal" dir="ltr">{customer.phone}</dd></div>
            {customer.alternate_phone && <div><dt className="text-ink/50">Alternate Phone</dt><dd className="font-semibold text-charcoal" dir="ltr">{customer.alternate_phone}</dd></div>}
            <div><dt className="text-ink/50">Address</dt><dd className="font-semibold text-charcoal">{customer.address || "—"}</dd></div>
            <div><dt className="text-ink/50">Email</dt><dd className="font-semibold text-charcoal">{customer.email || "—"}</dd></div>
            {customer.notes && <div><dt className="text-ink/50">Notes</dt><dd className="font-semibold text-charcoal">{customer.notes}</dd></div>}
          </dl>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-charcoal">Booking History</h2>
          {bookings.length === 0 ? (
            <EmptyState message="Is customer ki koi booking nahi hai." />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-120 text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                    <th className="py-2 pe-3">Booking</th>
                    <th className="py-2 pe-3">Event</th>
                    <th className="py-2 pe-3">Date</th>
                    <th className="py-2 pe-3">Total</th>
                    <th className="py-2 pe-3">Balance</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-stone-line last:border-0">
                      <td className="py-2 pe-3 font-semibold">
                        <Link href={`/bookings/${b.id}`} className="text-gold-dark hover:underline">{b.booking_code}</Link>
                      </td>
                      <td className="py-2 pe-3">{b.event_type} · {b.slot}</td>
                      <td className="py-2 pe-3">{formatDate(b.event_date)}</td>
                      <td className="py-2 pe-3">{formatPKR(b.total_price)}</td>
                      <td className="py-2 pe-3 font-semibold text-red-700">{formatPKR(b.balance_amount)}</td>
                      <td className="py-2"><Badge tone={bookingStatusTone(b.status)}>{b.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
