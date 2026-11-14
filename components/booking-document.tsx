"use client";

import { formatDate, formatPKR } from "@/lib/format";
import type { Booking } from "@/lib/types";

export function BookingDocument({ booking }: { booking: Booking }) {
  return (
    <div className="print-area rounded-xl bg-white p-6 text-charcoal ring-1 ring-stone-line">
      <div className="flex items-start justify-between gap-4 border-b-2 border-gold pb-4">
        <div>
          <p className="font-display text-2xl font-bold">
            MARQUE <span className="text-gold">ONE</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-ink/50">Booking Confirmation</p>
        </div>
        <div className="text-end text-xs text-ink/60">
          <p className="font-mono text-sm font-bold text-charcoal">{booking.booking_code}</p>
          <p className="mt-1">Created: {formatDate(booking.created_at)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink/50">Customer</h3>
          <p className="mt-1 text-sm font-semibold">{booking.customer_name || "—"}</p>
          <p className="text-sm" dir="ltr">{booking.customer_phone || "—"}</p>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink/50">Event</h3>
          <p className="mt-1 text-sm font-semibold">{booking.event_type}</p>
          <p className="text-sm">
            {formatDate(booking.event_date)} · {booking.slot === "day" ? "Day (12:00–4:00)" : "Night (7:00–11:00)"}
          </p>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink/50">Hall / Guests</h3>
          <p className="mt-1 text-sm font-semibold">{booking.hall_name || "MARQUE ONE"}</p>
          <p className="text-sm">{booking.guest_count} guests · {booking.tables_required} tables</p>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink/50">Status</h3>
          <p className="mt-1 text-sm font-semibold capitalize">{booking.status}</p>
          <p className="text-sm capitalize">{booking.payment_status.replace("_", " ")}</p>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-offwhite p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink/50">Payment Summary</h3>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 sm:col-span-2">
            <dt>Total Price</dt>
            <dd className="font-bold">{formatPKR(booking.total_price)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Advance Agreed</dt>
            <dd>{formatPKR(booking.advance_amount)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Received</dt>
            <dd className="text-emerald-700">{formatPKR(booking.amount_paid)}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:col-span-2 border-t border-stone-line pt-2">
            <dt className="font-semibold">Remaining</dt>
            <dd className="font-bold text-red-700">{formatPKR(booking.balance_amount)}</dd>
          </div>
        </dl>
      </div>

      {booking.special_instructions && (
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink/50">Special Instructions</h3>
          <p className="mt-1 text-sm">{booking.special_instructions}</p>
        </div>
      )}

      <div className="mt-8 grid gap-8 text-xs text-ink/60 sm:grid-cols-2">
        <div>
          <div className="border-t border-stone-line pt-2">Customer Signature</div>
        </div>
        <div>
          <div className="border-t border-stone-line pt-2">For MARQUE ONE</div>
        </div>
      </div>
      <p className="mt-6 text-[10px] text-ink/45">
        This confirmation is subject to MARQUE ONE booking and cancellation policies. Please keep this document safe.
      </p>
    </div>
  );
}
