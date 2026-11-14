"use client";

import React, { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MessageSquare, Printer, Receipt, Trash2 } from "lucide-react";
import {
  ApiError,
  allocateTables,
  bookingAction,
  fetchBooking,
  fetchBookingPayments,
  fetchBookingTables,
  fetchTables,
  normalizePhone,
  recordPayment,
  voidPayment,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/components/toast";
import { formatDate, formatDateTime, formatPKR, todayISO } from "@/lib/format";
import { PAYMENT_METHODS, type Booking, type HallTable, type Payment, type TableAllocation } from "@/lib/types";
import {
  Badge,
  bookingStatusTone,
  ConnectionError,
  dangerButtonClass,
  EmptyState,
  goldButtonClass,
  inputClass,
  labelClass,
  LoadingState,
  Modal,
  PageHeader,
  paymentStatusTone,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { ReceiptModal } from "@/components/receipt";
import { BookingDocument } from "@/components/booking-document";

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Amount 0 se zyada hona chahiye."),
  payment_date: z.string().min(1, "Date chuno."),
  method: z.string().min(1, "Method chuno."),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { t } = useLanguage();
  const toast = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tables, setTables] = useState<HallTable[]>([]);
  const [allocated, setAllocated] = useState<TableAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDocument, setShowDocument] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tableBusy, setTableBusy] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { payment_date: todayISO(), method: "cash" },
  });

  // Data loading lives in an Effect Event: effects may call it, and it
  // always sees the latest state without re-running the effect.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, pays, tbls, alloc] = await Promise.all([
        fetchBooking(id),
        fetchBookingPayments(id).catch(() => [] as Payment[]),
        fetchTables().catch(() => [] as HallTable[]),
        fetchBookingTables(id).catch(() => [] as TableAllocation[]),
      ]);
      setBooking(b);
      setPayments(pays);
      setTables(tbls);
      setAllocated(alloc);
      setSelectedTables(alloc.map((a) => a.table_id));
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

  const doAction = async (action: "confirm" | "cancel" | "complete", body?: Record<string, unknown>) => {
    setActionError("");
    setActionBusy(true);
    try {
      const updated = await bookingAction(id, action, body);
      setBooking(updated);
      if (action === "cancel") setShowCancel(false);
      toast.success(
        action === "confirm" ? "Booking confirm ho gayi." : action === "complete" ? "Booking complete ho gayi." : "Booking cancel ho gayi.",
      );
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action fail ho gaya — dobara try karo.");
    } finally {
      setActionBusy(false);
    }
  };

  const onRecordPayment = async (values: PaymentFormValues) => {
    setActionError("");
    try {
      const created = await recordPayment(id, {
        amount: values.amount,
        payment_date: values.payment_date,
        method: values.method,
        reference: values.reference || undefined,
        notes: values.notes || undefined,
      });
      setPayments((prev) => [created, ...prev]);
      setShowPaymentForm(false);
      reset({ payment_date: todayISO(), method: "cash", amount: 0, reference: "", notes: "" });
      toast.success(`Payment recorded — ${formatPKR(created.amount)}`);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Payment save nahi hui.");
    }
  };

  const onVoidPayment = async (paymentId: string) => {
    const reason = window.prompt("Void karne ki wajah likho (zaroori hai):");
    if (!reason) return;
    try {
      await voidPayment(paymentId, reason);
      toast.success("Payment void ho gayi.");
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Void nahi ho saka.");
    }
  };

  const onSaveTables = async () => {
    setTableBusy(true);
    setActionError("");
    try {
      const result = await allocateTables(id, selectedTables);
      setAllocated(result);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Tables allocate nahi ho sake.");
    } finally {
      setTableBusy(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !booking) {
    return (
      <div>
        <PageHeader title="Booking Detail" />
        <ConnectionError error={error || new Error("Booking nahi mili.")} onRetry={() => void load()} />
        <button type="button" onClick={() => router.push("/bookings")} className={`${secondaryButtonClass} mt-4`}>
          <ArrowLeft className="h-4 w-4" /> Back to Bookings
        </button>
      </div>
    );
  }

  const seatedCapacity = allocated.reduce((sum, a) => {
    const t = tables.find((x) => x.id === a.table_id);
    return sum + (t?.capacity || a.capacity || 0);
  }, 0);

  const timeline: Array<{ at: string; label: string; detail?: string | null }> = [
    { at: booking.created_at || "", label: "Booking created", detail: null },
    ...(booking.confirmed_at ? [{ at: booking.confirmed_at, label: "Booking confirmed", detail: null }] : []),
    ...payments
      .filter((p) => !p.is_voided)
      .map((p) => ({
        at: p.created_at || `${p.payment_date}T00:00:00`,
        label: `Payment received — ${formatPKR(p.amount)}`,
        detail: p.method.replace("_", " "),
      })),
    ...(booking.completed_at ? [{ at: booking.completed_at, label: "Event completed", detail: null }] : []),
    ...(booking.status === "cancelled"
      ? [{ at: booking.updated_at || "", label: "Booking cancelled", detail: booking.cancelled_reason || null }]
      : []),
  ]
    .filter((e) => e.at)
    .sort((a, b) => b.at.localeCompare(a.at));

  const reminderUrl = (() => {
    if (!booking.customer_phone) return "";
    const phone = normalizePhone(booking.customer_phone);
    const msg = `Dear ${booking.customer_name || "Client"}, reminder for your ${booking.event_type} on ${formatDate(booking.event_date)} at MARQUE ONE. Total: ${formatPKR(booking.total_price)}, received: ${formatPKR(booking.amount_paid)}, remaining: ${formatPKR(booking.balance_amount)}. Please clear the balance before the event. — MARQUE ONE`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  })();

  return (
    <div>
      <button type="button" onClick={() => router.push("/bookings")} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-dark hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Bookings
      </button>
      <PageHeader
        title={`${booking.booking_code} — ${booking.customer_name || ""}`}
        subtitle={`${booking.event_type} · ${formatDate(booking.event_date)} · ${booking.slot === "day" ? "Day" : "Night"}`}
        actions={
          <>
            {booking.status === "pending" && (
              <button type="button" data-requires-auth disabled={actionBusy} onClick={() => doAction("confirm")} className={goldButtonClass}>
                {t("confirmBooking")}
              </button>
            )}
            {booking.status === "confirmed" && (
              <button type="button" data-requires-auth disabled={actionBusy} onClick={() => doAction("complete")} className={primaryButtonClass}>
                {t("completeBooking")}
              </button>
            )}
            {(booking.status === "pending" || booking.status === "confirmed") && (
              <button type="button" data-requires-auth disabled={actionBusy} onClick={() => setShowCancel(true)} className={dangerButtonClass}>
                {t("cancelBooking")}
              </button>
            )}
            <button type="button" onClick={() => setShowDocument(true)} className={secondaryButtonClass}>
              <Printer className="h-4 w-4" /> Print / PDF
            </button>
          </>
        }
      />

      {actionError && (
        <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{actionError}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Booking summary */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
            <div className="flex flex-wrap gap-2">
              <Badge tone={bookingStatusTone(booking.status)}>{booking.status}</Badge>
              <Badge tone={paymentStatusTone(booking.payment_status)}>{booking.payment_status.replace("_", " ")}</Badge>
              <Badge tone="gold">{booking.slot === "day" ? "Day Slot" : "Night Slot"}</Badge>
            </div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-ink/50">Customer</dt><dd className="font-semibold text-charcoal">{booking.customer_name || "—"}</dd></div>
              <div><dt className="text-ink/50">Phone</dt><dd className="font-semibold text-charcoal" dir="ltr">{booking.customer_phone || "—"}</dd></div>
              <div><dt className="text-ink/50">Event Date</dt><dd className="font-semibold text-charcoal">{formatDate(booking.event_date)}</dd></div>
              <div><dt className="text-ink/50">Guests / Tables</dt><dd className="font-semibold text-charcoal">{booking.guest_count} guests · {booking.tables_required} tables</dd></div>
              <div><dt className="text-ink/50">Hall</dt><dd className="font-semibold text-charcoal">{booking.hall_name || "MARQUE ONE"}</dd></div>
              <div><dt className="text-ink/50">Special Instructions</dt><dd className="font-semibold text-charcoal">{booking.special_instructions || "—"}</dd></div>
              {booking.customer_id && (
                <div>
                  <dt className="text-ink/50">Customer Profile</dt>
                  <dd><Link href={`/customers/${booking.customer_id}`} className="font-semibold text-gold-dark hover:underline">View customer →</Link></dd>
                </div>
              )}
              {booking.cancelled_reason && (
                <div><dt className="text-ink/50">Cancel Reason</dt><dd className="font-semibold text-red-700">{booking.cancelled_reason}</dd></div>
              )}
            </dl>
          </div>

          {/* Timeline */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
            <h2 className="font-display text-lg font-bold text-charcoal">Booking Timeline</h2>
            <ol className="mt-4 space-y-4">
              {timeline.map((event, i) => (
                <li key={`${event.label}-${i}`} className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gold ring-4 ring-gold-light" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-charcoal">{event.label}</p>
                    {event.detail && <p className="text-xs capitalize text-ink/60">{event.detail}</p>}
                    <p className="mt-0.5 text-[11px] text-ink/40">{formatDateTime(event.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Payments */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-charcoal">Payments</h2>
          {booking.status !== "cancelled" && (
            <button type="button" data-requires-auth onClick={() => setShowPaymentForm((v) => !v)} className={goldButtonClass}>
              {t("recordPayment")}
            </button>
          )}
            </div>

            {showPaymentForm && (
              <form onSubmit={handleSubmit(onRecordPayment)} noValidate className="mt-5 grid gap-4 rounded-xl bg-offwhite p-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="amount" className={labelClass}>Amount (PKR) *</label>
                  <input id="amount" type="number" min={1} max={booking.balance_amount} className={inputClass} {...register("amount")} />
                  {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
                  <p className="mt-1 text-xs text-ink/50">Remaining balance: {formatPKR(booking.balance_amount)}</p>
                </div>
                <div>
                  <label htmlFor="payment_date" className={labelClass}>Payment Date *</label>
                  <input id="payment_date" type="date" className={inputClass} {...register("payment_date")} />
                  {errors.payment_date && <p className="mt-1 text-xs text-red-600">{errors.payment_date.message}</p>}
                </div>
                <div>
                  <label htmlFor="method" className={labelClass}>Method *</label>
                  <select id="method" className={inputClass} {...register("method")}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="reference" className={labelClass}>Reference (optional)</label>
                  <input id="reference" className={inputClass} placeholder="Transaction / cheque no." {...register("reference")} />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                    <button type="submit" data-requires-auth disabled={isSubmitting} className={goldButtonClass}>
                      {isSubmitting ? "Saving…" : "Save Payment"}
                    </button>
                  <button type="button" onClick={() => setShowPaymentForm(false)} className={secondaryButtonClass}>Cancel</button>
                </div>
              </form>
            )}

            <div className="mt-5 overflow-x-auto">
              {payments.length === 0 ? (
                <EmptyState message="No payments recorded yet for this booking." />
              ) : (
                <table className="w-full min-w-130 text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                      <th className="py-2 pe-3">Receipt</th>
                      <th className="py-2 pe-3">Date</th>
                      <th className="py-2 pe-3">Method</th>
                      <th className="py-2 pe-3">Amount</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className={p.is_voided ? "text-ink/40 line-through" : ""}>
                        <td className="py-2 pe-3 font-semibold">{p.receipt_number}</td>
                        <td className="py-2 pe-3">{formatDate(p.payment_date)}</td>
                        <td className="py-2 pe-3 capitalize">{p.method.replace("_", " ")}</td>
                        <td className="py-2 pe-3 font-semibold">{formatPKR(p.amount)}</td>
                        <td className="py-2">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setReceipt(p)} className="inline-flex items-center gap-1 rounded-lg border border-stone-line px-2.5 py-1.5 text-xs font-semibold hover:bg-offwhite" aria-label={`Receipt ${p.receipt_number}`}>
                              <Receipt className="h-3.5 w-3.5" /> Receipt
                            </button>
                            {!p.is_voided && (
                <button type="button" data-requires-auth onClick={() => onVoidPayment(p.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50" aria-label={`Void ${p.receipt_number}`}>
                  <Trash2 className="h-3.5 w-3.5" /> Void
                </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Tables */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
            <h2 className="font-display text-lg font-bold text-charcoal">Table Allocation</h2>
            <p className="mt-1 text-sm text-ink/60">
              Required: {booking.tables_required} tables · Seated capacity: {seatedCapacity} / {booking.guest_count} guests
            </p>
            {tables.length === 0 ? (
              <p className="mt-4 text-sm text-ink/60">No tables defined yet — add tables from the Tables page first.</p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {tables.filter((t) => t.is_active).map((t) => {
                    const checked = selectedTables.includes(t.id);
                    return (
                      <label key={t.id} className={`flex cursor-pointer flex-col items-center rounded-lg border px-2 py-3 text-sm ${checked ? "border-gold bg-gold-light font-semibold text-gold-dark" : "border-stone-line bg-white text-charcoal"}`}>
                        <input type="checkbox" className="sr-only" checked={checked} onChange={() => setSelectedTables((prev) => (checked ? prev.filter((x) => x !== t.id) : [...prev, t.id]))} />
                        {t.table_number}
                        <span className="text-xs text-ink/50">{t.capacity} seats</span>
                      </label>
                    );
                  })}
                </div>
                <button type="button" data-requires-auth onClick={onSaveTables} disabled={tableBusy} className={`${goldButtonClass} mt-4`}>
                  {tableBusy ? "Saving…" : `Save Allocation (${selectedTables.length} tables)`}
                </button>
                {seatedCapacity < booking.guest_count && selectedTables.length > 0 && (
                  <p className="mt-2 text-sm text-amber-700">
                    Warning: selected tables seat {seatedCapacity} guests, but the booking needs {booking.guest_count}. Add more tables.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-xl bg-charcoal p-6 text-white shadow-sm lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold">Payment Summary</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/10 pb-3">
              <dt className="text-white/70">Total Price</dt>
              <dd className="font-display text-lg font-bold">{formatPKR(booking.total_price)}</dd>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-3">
              <dt className="text-white/70">Advance Agreed</dt>
              <dd className="font-semibold">{formatPKR(booking.advance_amount)}</dd>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-3">
              <dt className="text-white/70">Received (incl. advance)</dt>
              <dd className="font-semibold text-emerald-300">{formatPKR(booking.amount_paid)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/70">Remaining to Collect</dt>
              <dd className="font-display text-lg font-bold text-gold">{formatPKR(booking.balance_amount)}</dd>
            </div>
          </dl>
          {booking.balance_amount > 0 && reminderUrl && (
            <a
              href={reminderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-gold px-3 py-2 text-center text-sm font-semibold text-charcoal hover:bg-gold-dark hover:text-white"
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp Payment Reminder
            </a>
          )}
          <p className="mt-5 text-xs leading-relaxed text-white/50">
            Payment status is derived from recorded payments only — a booking is
            never marked Fully Paid by hand.
          </p>
        </aside>
      </div>

      {receipt && <ReceiptModal payment={receipt} booking={booking} onClose={() => setReceipt(null)} />}

      {showDocument && (
        <Modal title="Booking Confirmation" onClose={() => setShowDocument(false)}>
          <BookingDocument booking={booking} />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => window.print()} className={goldButtonClass}>
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
            <button type="button" onClick={() => setShowDocument(false)} className={secondaryButtonClass}>Close</button>
          </div>
        </Modal>
      )}

      {showCancel && (
        <Modal title="Cancel Booking" onClose={() => setShowCancel(false)}>
          <p className="text-sm text-ink/70">
            Cancelling frees this date and slot for a new booking. Recorded payments stay on the
            booking — no refunds are processed in v1. A reason is required.
          </p>
          <label htmlFor="cancel_reason" className={`${labelClass} mt-4`}>Reason *</label>
          <textarea id="cancel_reason" rows={3} className={inputClass} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Customer requested cancellation" />
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={actionBusy || cancelReason.trim().length < 3} onClick={() => doAction("cancel", { reason: cancelReason.trim() })} className={dangerButtonClass}>
              Confirm Cancellation
            </button>
            <button type="button" onClick={() => setShowCancel(false)} className={secondaryButtonClass}>Back</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
