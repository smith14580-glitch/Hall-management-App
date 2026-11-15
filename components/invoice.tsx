"use client";

import { formatDate, formatPKR } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import type { Booking } from "@/lib/types";

function paymentStatusTone(status: string): string {
  if (status === "fully_paid") return "bg-emerald-100 text-emerald-800";
  if (status === "partially_paid") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
}

export function Invoice({ booking }: { booking: Booking }) {
  const { t } = useLanguage();
  const { getValue } = useSettings();

  const businessName = getValue("app_name");
  const businessAddress = getValue("business_address", "");
  const businessPhone = getValue("business_phone", "");
  const businessPhone2 = getValue("business_phone_2", "");
  const phoneLine = [businessPhone, businessPhone2].filter(Boolean).join(" · ");

  const guestAmount = Number(booking.guest_amount || 0);
  const guestRate = Number(booking.guest_rate || 0);
  const refreshmentAmount = Number(booking.refreshment_amount || 0);
  const refreshmentRate = Number(booking.refreshment_rate || 0);
  const refreshmentType = booking.refreshment_type ?? "none";
  const hallTypeAmount = Number(booking.hall_type_amount || 0);
  const hallTypeRate = Number(booking.hall_type_rate || 0);

  const hallPrice = Math.max(
    0,
    Number(booking.total_price || 0) - guestAmount - refreshmentAmount - hallTypeAmount,
  );

  const refreshmentLabel =
    refreshmentType === "water"
      ? t("waterBottles")
      : refreshmentType === "juice"
        ? t("juice")
        : refreshmentType === "both"
          ? t("waterJuice")
          : refreshmentType === "custom"
            ? booking.refreshment_custom_name || t("custom")
            : t("noRefreshment");

  const slotLabel =
    booking.slot === "day"
      ? `${t("day")} (${getValue("slot_day_start")}–${getValue("slot_day_end")})`
      : `${t("night")} (${getValue("slot_night_start")}–${getValue("slot_night_end")})`;

  const rows: Array<{ description: string; qty: string; rate: string; amount: number }> = [
    {
      description: `${t("hallPrice")} (${booking.slot === "day" ? t("day") : t("night")})`,
      qty: "1",
      rate: formatPKR(hallPrice),
      amount: hallPrice,
    },
  ];
  if (guestRate > 0) {
    rows.push({
      description: t("guests"),
      qty: String(booking.guest_count),
      rate: formatPKR(guestRate),
      amount: guestAmount,
    });
  }
  if (refreshmentType !== "none") {
    rows.push({
      description: `${t("refreshment")} — ${refreshmentLabel}`,
      qty: String(booking.refreshment_guests || 0),
      rate: formatPKR(refreshmentRate),
      amount: refreshmentAmount,
    });
  }
  if (hallTypeAmount > 0 || hallTypeRate > 0) {
    rows.push({
      description: booking.hall_type === "non_ac" ? t("nonAcCharges") : t("acCharges"),
      qty: "1",
      rate: formatPKR(hallTypeRate),
      amount: hallTypeAmount,
    });
  }

  const notes = booking.special_instructions?.trim();

  return (
    <div className="print-area rounded-xl bg-white p-6 text-charcoal ring-1 ring-stone-line">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-gold pb-4">
        <div>
          <p className="font-display text-2xl font-bold">{businessName}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-ink/50">{t("invoice")}</p>
          {(businessAddress || phoneLine) && (
            <div className="mt-2 text-xs text-ink/60">
              {businessAddress && <p>{businessAddress}</p>}
              {phoneLine && <p dir="ltr">{phoneLine}</p>}
            </div>
          )}
        </div>
        <div className="text-end text-xs text-ink/60">
          <p className="text-xs uppercase tracking-wide text-ink/50">{t("invoiceNo")}</p>
          <p className="font-mono text-sm font-bold text-charcoal">{booking.booking_code}</p>
          <p className="mt-1">{t("invoiceDate")}: {formatDate(booking.created_at)}</p>
          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${paymentStatusTone(booking.payment_status)}`}
          >
            {booking.payment_status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink/50">{t("billTo")}</h3>
          <p className="mt-1 text-sm font-semibold">{booking.customer_name || "—"}</p>
          {booking.customer_phone && <p className="text-sm" dir="ltr">{booking.customer_phone}</p>}
          {booking.customer?.address && <p className="text-sm">{booking.customer.address}</p>}
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink/50">{t("eventDetails")}</h3>
          <p className="mt-1 text-sm font-semibold">{booking.event_type}</p>
          <p className="text-sm">{formatDate(booking.event_date)} · {slotLabel}</p>
          <p className="text-sm">{t("guests")}: {booking.guest_count}</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
              <th className="py-2 pe-3">{t("description")}</th>
              <th className="py-2 pe-3 text-end">{t("qty")}</th>
              <th className="py-2 pe-3 text-end">{t("rate")}</th>
              <th className="py-2 text-end">{t("amount")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-stone-line/60 last:border-0">
                <td className="py-2 pe-3">{row.description}</td>
                <td className="py-2 pe-3 text-end">{row.qty}</td>
                <td className="py-2 pe-3 text-end">{row.rate}</td>
                <td className="py-2 text-end font-semibold">{formatPKR(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 ms-auto w-full max-w-xs space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-ink/60">{t("subtotal")}</span>
          <span className="font-semibold">{formatPKR(booking.total_price)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-ink/60">{t("advancePaid")}</span>
          <span className="font-semibold">{formatPKR(booking.advance_amount)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-ink/60">{t("balanceDue")}</span>
          <span className="font-semibold text-red-700">{formatPKR(booking.balance_amount)}</span>
        </div>
        <div className="flex justify-between gap-3 border-t border-stone-line pt-2">
          <span className="font-semibold">{t("total")}</span>
          <span className="font-display text-lg font-bold">{formatPKR(booking.total_price)}</span>
        </div>
      </div>

      {notes && (
        <div className="mt-4 rounded-lg bg-offwhite p-4">
          <p className="text-xs uppercase tracking-wide text-ink/50">{t("notes")}</p>
          <p className="mt-1 whitespace-pre-line text-sm">{notes}</p>
        </div>
      )}

      <div className="mt-8 grid gap-8 text-xs text-ink/60 sm:grid-cols-2">
        <div className="border-t border-stone-line pt-2">{t("customerSignature")}</div>
        <div className="border-t border-stone-line pt-2">
          {t("managerSignature")} — {businessName}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-ink/50">{t("thankYou")}</p>
    </div>
  );
}
