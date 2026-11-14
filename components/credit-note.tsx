"use client";

import { Printer } from "lucide-react";
import { formatDate, formatPKR } from "@/lib/format";
import type { Booking, Refund } from "@/lib/types";
import { Modal, goldButtonClass, secondaryButtonClass } from "@/components/ui";

export function CreditNoteModal({
  refund,
  booking,
  onClose,
}: {
  refund: Refund;
  booking: Booking;
  onClose: () => void;
}) {
  return (
    <Modal title={`Credit Note ${refund.credit_note_no}`} onClose={onClose}>
      <div className="print-area rounded-xl bg-white p-6 text-charcoal ring-1 ring-stone-line">
        <div className="flex items-start justify-between gap-4 border-b-2 border-gold pb-4">
          <div>
            <p className="font-display text-2xl font-bold">
              MARQUE <span className="text-gold">ONE</span>
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-ink/50">Credit Note / Refund</p>
          </div>
          <div className="text-end text-xs text-ink/60">
            <p className="font-mono text-sm font-bold text-charcoal">{refund.credit_note_no}</p>
            <p className="mt-1">{formatDate(refund.refund_date)}</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/50">Customer</dt>
            <dd className="font-semibold">{booking.customer_name || "—"}</dd>
            <dd dir="ltr">{booking.customer_phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/50">Booking</dt>
            <dd className="font-semibold">{booking.booking_code}</dd>
            <dd>{booking.event_type} · {formatDate(booking.event_date)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/50">Refund Method</dt>
            <dd className="font-semibold capitalize">{refund.method.replace("_", " ")}</dd>
            {refund.reference && <dd className="text-xs text-ink/60">Ref: {refund.reference}</dd>}
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/50">Refund Amount</dt>
            <dd className="font-display text-xl font-bold text-red-700">{formatPKR(refund.amount)}</dd>
          </div>
        </dl>
        <div className="mt-4 rounded-lg bg-offwhite p-4">
          <p className="text-xs uppercase tracking-wide text-ink/50">Reason</p>
          <p className="mt-1 text-sm">{refund.reason}</p>
        </div>
        <div className="mt-8 grid gap-8 text-xs text-ink/60 sm:grid-cols-2">
          <div className="border-t border-stone-line pt-2">Customer Signature</div>
          <div className="border-t border-stone-line pt-2">For MARQUE ONE</div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => window.print()} className={goldButtonClass}>
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
        <button type="button" onClick={onClose} className={secondaryButtonClass}>Close</button>
      </div>
    </Modal>
  );
}
