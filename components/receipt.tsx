"use client";

import React from "react";
import { Printer } from "lucide-react";
import { Modal, secondaryButtonClass } from "./ui";
import { formatDate, formatPKR } from "@/lib/format";
import type { Booking, Payment } from "@/lib/types";

export function ReceiptModal({
  payment,
  booking,
  onClose,
}: {
  payment: Payment;
  booking?: Booking | null;
  onClose: () => void;
}) {
  const customerName = booking?.customer_name || payment.customer_name || "—";
  const bookingCode = booking?.booking_code || payment.booking_code || "—";
  return (
    <Modal title="Payment Receipt" onClose={onClose}>
      <div className="print-area rounded-xl border border-stone-line bg-white p-6">
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-charcoal">
            MARQUE <span className="text-gold">ONE</span>
          </p>
          <p className="text-sm text-ink/60">Marriage Hall — Payment Receipt</p>
        </div>
        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between border-b border-stone-line pb-2">
            <dt className="text-ink/60">Receipt No.</dt>
            <dd className="font-semibold text-charcoal">{payment.receipt_number}</dd>
          </div>
          <div className="flex justify-between border-b border-stone-line pb-2">
            <dt className="text-ink/60">Booking</dt>
            <dd className="font-semibold text-charcoal">{bookingCode}</dd>
          </div>
          <div className="flex justify-between border-b border-stone-line pb-2">
            <dt className="text-ink/60">Customer</dt>
            <dd className="font-semibold text-charcoal">{customerName}</dd>
          </div>
          <div className="flex justify-between border-b border-stone-line pb-2">
            <dt className="text-ink/60">Payment Date</dt>
            <dd className="font-semibold text-charcoal">{formatDate(payment.payment_date)}</dd>
          </div>
          <div className="flex justify-between border-b border-stone-line pb-2">
            <dt className="text-ink/60">Method</dt>
            <dd className="font-semibold capitalize text-charcoal">{payment.method.replace("_", " ")}</dd>
          </div>
          {payment.reference && (
            <div className="flex justify-between border-b border-stone-line pb-2">
              <dt className="text-ink/60">Reference</dt>
              <dd className="font-semibold text-charcoal">{payment.reference}</dd>
            </div>
          )}
          <div className="flex justify-between pt-2">
            <dt className="font-semibold text-charcoal">Amount Paid</dt>
            <dd className="font-display text-xl font-bold text-charcoal">{formatPKR(payment.amount)}</dd>
          </div>
          {payment.is_voided && (
            <p className="mt-2 rounded-lg bg-red-100 px-3 py-2 text-center text-sm font-bold text-red-700">
              VOIDED{payment.void_reason ? ` — ${payment.void_reason}` : ""}
            </p>
          )}
          {booking && (
            <div className="mt-4 rounded-lg bg-offwhite px-3 py-2 text-xs text-ink/60">
              Total {formatPKR(booking.total_price)} · Paid {formatPKR(booking.amount_paid)} · Balance{" "}
              {formatPKR(booking.balance_amount)}
            </div>
          )}
        </dl>
      </div>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => window.print()} className={secondaryButtonClass}>
          <Printer className="h-4 w-4" /> Print Receipt
        </button>
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Close
        </button>
      </div>
    </Modal>
  );
}
