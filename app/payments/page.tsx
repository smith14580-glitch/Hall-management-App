"use client";

import React, { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { fetchAllPayments, fetchOutstanding } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { formatDate, formatPKR } from "@/lib/format";
import type { Booking, Payment } from "@/lib/types";
import {
  Badge,
  ConnectionError,
  EmptyState,
  LoadingState,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { ReceiptModal } from "@/components/receipt";

export default function PaymentsPage() {
  const { t } = useLanguage();
  const [outstanding, setOutstanding] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [receipt, setReceipt] = useState<Payment | null>(null);

  // Data loading lives in an Effect Event: effects may call it, and it
  // always sees the latest state without re-running the effect.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, p] = await Promise.all([fetchOutstanding(), fetchAllPayments()]);
      setOutstanding(o);
      setPayments(p);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const totalOutstanding = outstanding.reduce((s, b) => s + b.balance_amount, 0);
  const totalReceived = payments.filter((p) => !p.is_voided).reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <PageHeader title={t("payments")} subtitle="Har payment alag record hoti hai. Receipt dobara print ho sakti hai." />

      {error ? (
        <ConnectionError error={error} onRetry={() => void load()} />
      ) : loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Outstanding Balance" value={formatPKR(totalOutstanding)} sub={`${outstanding.length} bookings with balance due`} />
            <StatCard label="Total Received" value={formatPKR(totalReceived)} sub={`${payments.filter((p) => !p.is_voided).length} payments recorded`} />
            <StatCard label="Voided Payments" value={String(payments.filter((p) => p.is_voided).length)} sub="Voided receipts stay in history" />
          </div>

          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
            <h2 className="font-display text-lg font-bold text-charcoal">Outstanding Balances</h2>
            {outstanding.length === 0 ? (
              <EmptyState message="Koi outstanding balance nahi hai — sab clear hai." />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-150 text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                      <th className="py-2 pe-3">Booking</th>
                      <th className="py-2 pe-3">Customer</th>
                      <th className="py-2 pe-3">Event Date</th>
                      <th className="py-2 pe-3">Total</th>
                      <th className="py-2 pe-3">Paid</th>
                      <th className="py-2 pe-3">Balance</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outstanding.map((b) => (
                      <tr key={b.id} className="border-b border-stone-line last:border-0">
                        <td className="py-2 pe-3 font-semibold">
                          <Link href={`/bookings/${b.id}`} className="text-gold-dark hover:underline">{b.booking_code}</Link>
                        </td>
                        <td className="py-2 pe-3">{b.customer_name || "—"}</td>
                        <td className="py-2 pe-3">{formatDate(b.event_date)}</td>
                        <td className="py-2 pe-3">{formatPKR(b.total_price)}</td>
                        <td className="py-2 pe-3">{formatPKR(b.amount_paid)}</td>
                        <td className="py-2 pe-3 font-bold text-red-700">{formatPKR(b.balance_amount)}</td>
                        <td className="py-2">
                          <Link href={`/bookings/${b.id}`} className="font-semibold text-gold-dark hover:underline">Record Payment →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
            <h2 className="font-display text-lg font-bold text-charcoal">Payment History</h2>
            {payments.length === 0 ? (
              <EmptyState message="No payments recorded yet." />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-150 text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                      <th className="py-2 pe-3">Receipt</th>
                      <th className="py-2 pe-3">Booking</th>
                      <th className="py-2 pe-3">Customer</th>
                      <th className="py-2 pe-3">Date</th>
                      <th className="py-2 pe-3">Method</th>
                      <th className="py-2 pe-3">Amount</th>
                      <th className="py-2">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className={`border-b border-stone-line last:border-0 ${p.is_voided ? "text-ink/40" : ""}`}>
                        <td className="py-2 pe-3 font-semibold">{p.receipt_number}</td>
                        <td className="py-2 pe-3">
                          {p.booking_id ? <Link href={`/bookings/${p.booking_id}`} className="text-gold-dark hover:underline">{p.booking_code || p.booking_id.slice(0, 8)}</Link> : "—"}
                        </td>
                        <td className="py-2 pe-3">{p.customer_name || "—"}</td>
                        <td className="py-2 pe-3">{formatDate(p.payment_date)}</td>
                        <td className="py-2 pe-3 capitalize">{p.method.replace("_", " ")}</td>
                        <td className="py-2 pe-3 font-semibold">{formatPKR(p.amount)}</td>
                        <td className="py-2">
                          {p.is_voided ? (
                            <Badge tone="red">Voided</Badge>
                          ) : (
                <button type="button" onClick={() => setReceipt(p)} data-requires-auth className="inline-flex items-center gap-1 rounded-lg border border-stone-line px-2.5 py-1.5 text-xs font-semibold hover:bg-offwhite">
                  <Receipt className="h-3.5 w-3.5" /> View
                </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {receipt && <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
