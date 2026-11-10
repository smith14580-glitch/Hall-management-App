"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CalendarPlus } from "lucide-react";
import { ApiError, checkAvailability, createBooking, fetchHalls, fetchPricing } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { formatPKR, todayISO } from "@/lib/format";
import { EVENT_TYPES, type Pricing } from "@/lib/types";
import {
  ConnectionError,
  goldButtonClass,
  inputClass,
  labelClass,
  LoadingState,
  PageHeader,
  secondaryButtonClass,
} from "@/components/ui";

const schema = z.object({
  customer_name: z.string().min(2, "Customer ka poora naam likho."),
  phone: z.string().min(10, "Phone number kam az kam 10 digits ka ho."),
  address: z.string().min(3, "Address likho."),
  email: z.string().email("Sahi email likho.").optional().or(z.literal("")),
  event_type: z.string().min(1, "Event type chuno."),
  event_date: z.string().min(1, "Date chuno."),
  slot: z.enum(["day", "night"]),
  guest_count: z.coerce.number().int().min(1, "Guests kam az kam 1 hon."),
  tables_required: z.coerce.number().int().min(1, "Tables kam az kam 1 hon."),
  special_instructions: z.string().optional(),
  advance_amount: z.coerce.number().min(0, "Advance 0 ya zyada ho."),
});

type FormValues = z.infer<typeof schema>;

export default function NewBookingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [hallId, setHallId] = useState("");
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [conflict, setConflict] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      event_type: "Wedding",
      slot: "night",
      guest_count: 300,
      tables_required: 30,
      advance_amount: 150000,
    },
  });

  const slot = useWatch({ control, name: "slot" });
  const eventDate = useWatch({ control, name: "event_date" });
  const advance = useWatch({ control, name: "advance_amount" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, halls] = await Promise.all([fetchPricing(), fetchHalls()]);
        if (cancelled) return;
        setPricing(p);
        if (halls.length > 0) setHallId(halls[0].id);
        setValue("advance_amount", Math.round((p.night_price * 50) / 100));
      } catch (err) {
        if (!cancelled) setLoadError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    // Prefill date from ?date=YYYY-MM-DD (calendar link)
    try {
      const params = new URLSearchParams(window.location.search);
      const d = params.get("date");
      if (d) setValue("event_date", d);
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true;
    };
  }, [setValue]);

  // Live availability check when date/slot change. All state updates
  // happen inside the async callback, never synchronously in the effect.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!hallId || !eventDate || eventDate < todayISO()) {
        if (!cancelled) setConflict(null);
        return;
      }
      setChecking(true);
      try {
        const res = await checkAvailability(hallId, eventDate, slot);
        if (cancelled) return;
        setConflict(
          res.available
            ? null
            : `Ye date aur slot pehle se booked hai${res.conflicting_booking_code ? ` (${res.conflicting_booking_code})` : ""}. Doosri date ya slot chuno.`,
        );
      } catch {
        if (!cancelled) setConflict(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hallId, eventDate, slot]);

  const total = pricing ? (slot === "day" ? pricing.day_price : pricing.night_price) : 0;
  const remaining = Math.max(0, total - (advance || 0));

  const onSubmit = async (values: FormValues) => {
    setSubmitError("");
    if (conflict) {
      setSubmitError(conflict);
      return;
    }
    if (values.event_date < todayISO()) {
      setSubmitError("Past date par booking nahi ho sakti — aaj ya aane wali date chuno.");
      return;
    }
    try {
      const created = await createBooking({
        customer_name: values.customer_name.trim(),
        phone: values.phone.trim(),
        address: values.address.trim(),
        email: values.email || undefined,
        event_type: values.event_type,
        event_date: values.event_date,
        slot: values.slot,
        hall_id: hallId,
        guest_count: values.guest_count,
        tables_required: values.tables_required,
        special_instructions: values.special_instructions || undefined,
        total_price: total,
        advance_amount: values.advance_amount,
      });
      router.push(`/bookings/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "BOOKING_CONFLICT") {
        setSubmitError("Ye date aur slot pehle se booked hai. Doosri date ya slot chuno.");
      } else if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Booking save nahi hui — dobara try karo.");
      }
    }
  };

  if (loading) return <LoadingState />;
  if (loadError || !pricing) {
    return (
      <div>
        <PageHeader title={t("newBooking")} />
        <ConnectionError error={loadError || new Error("Pricing load nahi hui.")} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t("newBooking")} subtitle="Customer, event aur price — sab ek form me. Price hall pricing se khud calculate hota hai." />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-charcoal">Customer Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="customer_name" className={labelClass}>Full Name *</label>
              <input id="customer_name" className={inputClass} {...register("customer_name")} />
              {errors.customer_name && <p className="mt-1 text-xs text-red-600">{errors.customer_name.message}</p>}
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>Phone *</label>
              <input id="phone" type="tel" className={inputClass} placeholder="03xx-xxxxxxx" {...register("phone")} />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            <div>
              <label htmlFor="address" className={labelClass}>Address *</label>
              <input id="address" className={inputClass} {...register("address")} />
              {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>Email (optional)</label>
              <input id="email" type="email" className={inputClass} {...register("email")} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
          </div>

          <h2 className="border-t border-stone-line pt-5 font-display text-lg font-bold text-charcoal">Event Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="event_type" className={labelClass}>Event Type *</label>
              <select id="event_type" className={inputClass} {...register("event_type")}>
                {EVENT_TYPES.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              {errors.event_type && <p className="mt-1 text-xs text-red-600">{errors.event_type.message}</p>}
            </div>
            <div>
              <label htmlFor="event_date" className={labelClass}>Wedding Date *</label>
              <input id="event_date" type="date" min={todayISO()} className={inputClass} {...register("event_date")} />
              {errors.event_date && <p className="mt-1 text-xs text-red-600">{errors.event_date.message}</p>}
            </div>
            <div>
              <span className={labelClass}>Slot *</span>
              <div className="flex gap-2">
                {(["day", "night"] as const).map((s) => (
                  <label key={s} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold ${slot === s ? "border-gold bg-gold-light text-gold-dark" : "border-stone-line bg-white text-charcoal"}`}>
                    <input type="radio" value={s} className="sr-only" {...register("slot")} />
                    {s === "day" ? `${t("day")} (12:00–16:00)` : `${t("night")} (19:00–23:00)`}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="guest_count" className={labelClass}>Guests *</label>
                <input id="guest_count" type="number" min={1} className={inputClass} {...register("guest_count")} />
                {errors.guest_count && <p className="mt-1 text-xs text-red-600">{errors.guest_count.message}</p>}
              </div>
              <div>
                <label htmlFor="tables_required" className={labelClass}>Tables *</label>
                <input id="tables_required" type="number" min={1} className={inputClass} {...register("tables_required")} />
                {errors.tables_required && <p className="mt-1 text-xs text-red-600">{errors.tables_required.message}</p>}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="special_instructions" className={labelClass}>Special Instructions</label>
            <textarea id="special_instructions" rows={3} className={inputClass} placeholder="Stage, food, decoration…" {...register("special_instructions")} />
          </div>

          {checking && <p className="text-sm text-ink/60">Availability check ho rahi hai…</p>}
          {conflict && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {conflict}
            </p>
          )}
          {submitError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{submitError}</p>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting || !!conflict} className={goldButtonClass}>
              <CalendarPlus className="h-4 w-4" /> {isSubmitting ? "Saving…" : "Create Booking"}
            </button>
            <button type="button" onClick={() => router.push("/bookings")} className={secondaryButtonClass}>
              {t("cancel")}
            </button>
          </div>
        </div>

        <aside className="h-fit rounded-xl bg-charcoal p-6 text-white shadow-sm lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold">Price Summary</h2>
          <p className="mt-1 text-xs text-white/60">
            Hall: {pricing.hall_name || "MARQUE ONE"} · Slot: {slot === "day" ? "Day" : "Night"}
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/10 pb-3">
              <dt className="text-white/70">Total Price</dt>
              <dd className="font-display text-lg font-bold">{formatPKR(total)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <label htmlFor="advance_amount" className="text-white/70">Advance (50% default)</label>
              <input
                id="advance_amount"
                type="number"
                min={0}
                max={total}
                className="w-32 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-right text-sm font-semibold text-white outline-none focus:border-gold"
                {...register("advance_amount")}
              />
            </div>
            {errors.advance_amount && <p className="text-xs text-red-300">{errors.advance_amount.message}</p>}
            <div className="flex justify-between">
              <dt className="text-white/70">Remaining after advance</dt>
              <dd className="font-semibold text-gold">{formatPKR(remaining)}</dd>
            </div>
          </dl>
          <p className="mt-5 text-xs leading-relaxed text-white/50">
            Day price {formatPKR(pricing.day_price)} (unconfirmed — Settings me change ho sakta hai) ·
            Night price {formatPKR(pricing.night_price)}. Price booking time par snapshot hota hai;
            baad me price badle to is booking par asar nahi hoga.
          </p>
        </aside>
      </form>
    </div>
  );
}
