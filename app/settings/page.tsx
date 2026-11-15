"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, fetchHalls, updateHall } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { formatPKR } from "@/lib/format";
import type { Hall } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { useToast } from "@/components/toast";
import {
  ConnectionError,
  goldButtonClass,
  inputClass,
  labelClass,
  LoadingState,
  PageHeader,
} from "@/components/ui";

const EDITABLE: Array<{ key: string; label: string; hint: string; type?: string }> = [
  { key: "hall_day_price", label: "Day Price (PKR)", hint: "Nayi bookings par lagega. Purani bookings ki price snapshot safe rehti hai." },
  { key: "hall_night_price", label: "Night Price (PKR)", hint: "Nayi bookings par lagega. Purani bookings ki price snapshot safe rehti hai." },
  { key: "default_advance_percent", label: "Default Advance (%)", hint: "Default 0–100%. Per booking badal sakte hain." },
  { key: "duty_start_time", label: "Duty Start Time", hint: "Attendance late calculation isi se hogi.", type: "time" },
  { key: "late_grace_minutes", label: "Late Grace (minutes)", hint: "Is minutes ke baad late count hoga." },
  { key: "slot_day_start", label: "Day Slot Start", hint: "Day slot ka start time.", type: "time" },
  { key: "slot_day_end", label: "Day Slot End", hint: "Day slot ka end time.", type: "time" },
  { key: "slot_night_start", label: "Night Slot Start", hint: "Night slot ka start time.", type: "time" },
  { key: "slot_night_end", label: "Night Slot End", hint: "Night slot ka end time.", type: "time" },
];

const ADDON_EDITABLE: Array<{ key: string; labelKey: string; hint: string }> = [
  { key: "addon_refreshment_water_per_guest", labelKey: "refreshmentWaterPerGuest", hint: "Water bottles — per guest charge." },
  { key: "addon_refreshment_juice_per_guest", labelKey: "refreshmentJuicePerGuest", hint: "Juice — per guest charge." },
  { key: "addon_refreshment_both_per_guest", labelKey: "refreshmentBothPerGuest", hint: "Water + juice — per guest charge." },
  { key: "addon_ac_price", labelKey: "acPrice", hint: "Flat AC charges per event." },
  { key: "addon_non_ac_price", labelKey: "nonAcPrice", hint: "Flat Non-AC charges per event." },
  { key: "guest_price_per_guest", labelKey: "guestPricePerGuest", hint: "Per-guest charge added to every booking. 0 disables it." },
];

const ALL_EDITABLE = [...EDITABLE, ...ADDON_EDITABLE];

const LABELS: Record<string, string> = {
  hall_day_price: "Day price",
  hall_night_price: "Night price",
  default_advance_percent: "Default advance",
  duty_start_time: "Duty start",
  late_grace_minutes: "Late grace",
  slot_day_start: "Day slot start",
  slot_day_end: "Day slot end",
  slot_night_start: "Night slot start",
  slot_night_end: "Night slot end",
  addon_refreshment_water_per_guest: "Water / guest",
  addon_refreshment_juice_per_guest: "Juice / guest",
  addon_refreshment_both_per_guest: "Water + juice / guest",
  addon_ac_price: "AC price",
  addon_non_ac_price: "Non-AC price",
  guest_price_per_guest: "Guest price / guest",
};

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function SettingsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const { settings, saveSettings, refresh } = useSettings();
  const [values, setValues] = useState<Record<string, string>>({});
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [hall, setHall] = useState<Hall | null>(null);
  const [guestCap, setGuestCap] = useState("");
  const [tableCap, setTableCap] = useState("");
  const [initialGuestCap, setInitialGuestCap] = useState("");
  const [initialTableCap, setInitialTableCap] = useState("");
  const [initialHallDayPrice, setInitialHallDayPrice] = useState("");
  const [initialHallNightPrice, setInitialHallNightPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [msg, setMsg] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const loadHall = useCallback(async () => {
    try {
      const halls = await fetchHalls().catch(() => [] as Hall[]);
      if (halls.length > 0) {
        setHall(halls[0]);
        const gc = halls[0].capacity_guests === null ? "" : String(halls[0].capacity_guests);
        const tc = halls[0].capacity_tables === null ? "" : String(halls[0].capacity_tables);
        const dp = String(halls[0].day_price ?? "");
        const np = String(halls[0].night_price ?? "");
        setGuestCap(gc);
        setTableCap(tc);
        setInitialGuestCap(gc);
        setInitialTableCap(tc);
        setInitialHallDayPrice(dp);
        setInitialHallNightPrice(np);
      }
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const s = await refresh();
        if (!active) return;
        const map: Record<string, string> = {};
        ALL_EDITABLE.forEach((item) => {
          map[item.key] = String(s[item.key] ?? "");
        });
        setValues(map);
        setInitial(map);
        await loadHall();
      } catch (err) {
        if (active) setError(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadHall, refresh]);

  const allSettingsList = useMemo(
    () => Object.entries(settings).sort(([a], [b]) => a.localeCompare(b)),
    [settings],
  );

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const dayPrice = Number(values.hall_day_price);
    const nightPrice = Number(values.hall_night_price);
    const advance = Number(values.default_advance_percent);
    const grace = Number(values.late_grace_minutes);

    if (!Number.isFinite(dayPrice) || dayPrice <= 0) errs.hall_day_price = "Day price 0 se zyada hona chahiye.";
    if (!Number.isFinite(nightPrice) || nightPrice <= 0) errs.hall_night_price = "Night price 0 se zyada hona chahiye.";
    if (!Number.isFinite(advance) || advance < 0 || advance > 100) errs.default_advance_percent = "Advance 0 se 100 ke darmiyan hona chahiye.";

    const duty = values.duty_start_time;
    const ds = values.slot_day_start;
    const de = values.slot_day_end;
    const ns = values.slot_night_start;
    const ne = values.slot_night_end;
    if (!duty) errs.duty_start_time = "Duty start time zaroori hai.";
    if (!ds) errs.slot_day_start = "Day slot start zaroori hai.";
    if (!de) errs.slot_day_end = "Day slot end zaroori hai.";
    if (!ns) errs.slot_night_start = "Night slot start zaroori hai.";
    if (!ne) errs.slot_night_end = "Night slot end zaroori hai.";
    if (ds && de && toMinutes(de) <= toMinutes(ds)) errs.slot_day_end = "Day slot end, start se baad hona chahiye.";
    if (ns && ne && toMinutes(ne) <= toMinutes(ns)) errs.slot_night_end = "Night slot end, start se baad hona chahiye.";
    if (!Number.isFinite(grace) || grace < 0) errs.late_grace_minutes = "Late grace 0 ya zyada hona chahiye.";

    ADDON_EDITABLE.forEach(({ key }) => {
      const raw = String(values[key] ?? "");
      const num = Number(raw);
      if (raw === "" || !Number.isFinite(num) || num < 0) {
        errs[key] = "0 ya zyada hona chahiye.";
      }
    });

    if (guestCap !== "") {
      const g = Number(guestCap);
      if (!Number.isFinite(g) || g <= 0) errs.capacity_guests = "Max guests 0 se zyada hona chahiye.";
    }
    if (tableCap !== "") {
      const tcap = Number(tableCap);
      if (!Number.isFinite(tcap) || tcap <= 0) errs.capacity_tables = "Total tables 0 se zyada hona chahiye.";
    }
    return errs;
  };

  const saveAll = async () => {
    setMsg("");
    setFormError("");
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setFormError("Kuch values galat hain — neeche errors dekhein.");
      return;
    }
    setBusy(true);
    try {
      const updates: Record<string, string> = {};
      const changedLabels: string[] = [];
      for (const item of ALL_EDITABLE) {
        const v = String(values[item.key] ?? "");
        const prev = String(initial[item.key] ?? "");
        if (v !== prev) {
          updates[item.key] = v;
          changedLabels.push(`${LABELS[item.key]}: ${prev || "—"} → ${v}`);
        }
      }

      if (Object.keys(updates).length > 0) {
        const confirmed = await saveSettings(updates, { syncRemote: true });
        const nextInitial = { ...initial };
        Object.keys(updates).forEach((k) => {
          nextInitial[k] = String(confirmed[k] ?? updates[k]);
        });
        setInitial(nextInitial);
        setValues((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(updates).map((k) => [k, nextInitial[k]])) }));
      }

      const dayPrice = String(values.hall_day_price ?? "");
      const nightPrice = String(values.hall_night_price ?? "");
      const priceChanged = dayPrice !== initialHallDayPrice || nightPrice !== initialHallNightPrice;
      const capacityChanged = guestCap !== initialGuestCap || tableCap !== initialTableCap;
      if (hall && (priceChanged || capacityChanged)) {
        await updateHall(hall.id, {
          ...(priceChanged
            ? { day_price: Number(dayPrice), night_price: Number(nightPrice) }
            : {}),
          ...(capacityChanged
            ? {
                capacity_guests: guestCap === "" ? null : Number(guestCap),
                capacity_tables: tableCap === "" ? null : Number(tableCap),
              }
            : {}),
        });
        if (priceChanged) {
          changedLabels.push(`Hall day price: ${initialHallDayPrice || "—"} → ${dayPrice || "—"}`);
          changedLabels.push(`Hall night price: ${initialHallNightPrice || "—"} → ${nightPrice || "—"}`);
          setInitialHallDayPrice(dayPrice);
          setInitialHallNightPrice(nightPrice);
          setHall((h) =>
            h ? { ...h, day_price: Number(dayPrice), night_price: Number(nightPrice) } : h,
          );
        }
        if (guestCap !== initialGuestCap) changedLabels.push(`Max guests: ${initialGuestCap || "—"} → ${guestCap || "—"}`);
        if (tableCap !== initialTableCap) changedLabels.push(`Total tables: ${initialTableCap || "—"} → ${tableCap || "—"}`);
        setInitialGuestCap(guestCap);
        setInitialTableCap(tableCap);
      }

      await refresh({ syncRemote: true });
      const detail = changedLabels.length ? ` ${changedLabels.join("; ")}.` : " Koi value change nahi hui.";
      const successMsg = `Settings saved — nayi values har jagah apply ho gayi hain.${detail}`;
      setMsg(successMsg);
      toast.success("Settings saved — nayi values har jagah apply ho gayi hain.");
    } catch (err) {
      await refresh().catch(() => undefined);
      const message = err instanceof ApiError ? err.message : "Settings save nahi hui. Purani values wapas kar di gayi hain.";
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) {
    return (
      <div>
        <PageHeader title={t("settings")} />
        <ConnectionError
          error={error}
          onRetry={() => {
            setError(null);
            void refresh().finally(() => void loadHall());
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("settings")}
        subtitle="Hall pricing, advance, slot timings aur duty rules — sab yahan se badalte hain. Nayi values save ke baad foran apply hoti hain."
        actions={
          <button type="button" data-requires-auth onClick={saveAll} disabled={busy} className={goldButtonClass}>
            {busy ? "Saving…" : t("save")}
          </button>
        }
      />

      {msg && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{msg}</p>}
      {formError && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{formError}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
          <h2 className="font-display text-lg font-bold text-charcoal">Pricing & Advance</h2>
          <div className="mt-4 space-y-4">
            {EDITABLE.slice(0, 3).map((item) => (
              <div key={item.key}>
                <label htmlFor={item.key} className={labelClass}>{item.label}</label>
                <input
                  id={item.key}
                  type="number"
                  min={item.key === "default_advance_percent" ? 0 : 1}
                  max={item.key === "default_advance_percent" ? 100 : undefined}
                  className={inputClass}
                  value={values[item.key] || ""}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [item.key]: e.target.value }));
                    setFieldErrors((fe) => ({ ...fe, [item.key]: "" }));
                  }}
                />
                {fieldErrors[item.key] && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors[item.key]}</p>}
                <p className="mt-1 text-xs text-ink/50">{item.hint}</p>
              </div>
            ))}
            <p className="rounded-lg bg-offwhite px-3 py-2 text-xs text-ink/60">
              Current: Day {formatPKR(Number(values.hall_day_price || 0))} · Night {formatPKR(Number(values.hall_night_price || 0))}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
          <h2 className="font-display text-lg font-bold text-charcoal">{t("addonPrices")}</h2>
          <p className="mt-1 text-sm text-ink/60">Refreshment aur hall type charges — nayi bookings par lagega.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ADDON_EDITABLE.map((item) => (
              <div key={item.key}>
                <label htmlFor={item.key} className={labelClass}>{t(item.labelKey)}</label>
                <input
                  id={item.key}
                  type="number"
                  min={0}
                  className={inputClass}
                  value={values[item.key] || ""}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [item.key]: e.target.value }));
                    setFieldErrors((fe) => ({ ...fe, [item.key]: "" }));
                  }}
                />
                {fieldErrors[item.key] && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors[item.key]}</p>}
                <p className="mt-1 text-xs text-ink/50">{item.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
          <h2 className="font-display text-lg font-bold text-charcoal">Hall Capacity</h2>
          <p className="mt-1 text-sm text-ink/60">
            Capacity yahan se set hoti hai — booking/capacity checks current values use karenge.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="capacity_guests" className={labelClass}>Max Guests</label>
              <input
                id="capacity_guests"
                type="number"
                min={1}
                className={inputClass}
                value={guestCap}
                onChange={(e) => {
                  setGuestCap(e.target.value);
                  setFieldErrors((fe) => ({ ...fe, capacity_guests: "" }));
                }}
                placeholder="e.g. 500"
              />
              {fieldErrors.capacity_guests && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.capacity_guests}</p>}
            </div>
            <div>
              <label htmlFor="capacity_tables" className={labelClass}>Total Tables</label>
              <input
                id="capacity_tables"
                type="number"
                min={1}
                className={inputClass}
                value={tableCap}
                onChange={(e) => {
                  setTableCap(e.target.value);
                  setFieldErrors((fe) => ({ ...fe, capacity_tables: "" }));
                }}
                placeholder="e.g. 50"
              />
              {fieldErrors.capacity_tables && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.capacity_tables}</p>}
            </div>
          </div>
          {hall && <p className="mt-3 text-xs text-ink/50">Hall: {hall.name}</p>}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
          <h2 className="font-display text-lg font-bold text-charcoal">Slot Timings</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {EDITABLE.slice(5).map((item) => (
              <div key={item.key}>
                <label htmlFor={item.key} className={labelClass}>{item.label}</label>
                <input
                  id={item.key}
                  type="time"
                  className={inputClass}
                  value={values[item.key] || ""}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [item.key]: e.target.value }));
                    setFieldErrors((fe) => ({ ...fe, [item.key]: "" }));
                  }}
                />
                {fieldErrors[item.key] && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors[item.key]}</p>}
                <p className="mt-1 text-xs text-ink/50">{item.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
          <h2 className="font-display text-lg font-bold text-charcoal">Attendance Rules</h2>
          <div className="mt-4 space-y-4">
            {EDITABLE.slice(3, 5).map((item) => (
              <div key={item.key}>
                <label htmlFor={item.key} className={labelClass}>{item.label}</label>
                <input
                  id={item.key}
                  type={item.type || "number"}
                  min={item.type ? undefined : 0}
                  className={inputClass}
                  value={values[item.key] || ""}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [item.key]: e.target.value }));
                    setFieldErrors((fe) => ({ ...fe, [item.key]: "" }));
                  }}
                />
                {fieldErrors[item.key] && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors[item.key]}</p>}
                <p className="mt-1 text-xs text-ink/50">{item.hint}</p>
              </div>
            ))}
          </div>
          <h3 className="mt-6 font-display text-base font-bold text-charcoal">All Settings (read-only list)</h3>
          <ul className="mt-3 space-y-1 text-xs">
            {allSettingsList.map(([key, value]) => (
              <li key={key} className="flex justify-between gap-3 border-b border-stone-line pb-1">
                <span className="font-mono text-ink/70">{key}</span>
                <span className="font-semibold text-charcoal">{String(value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
