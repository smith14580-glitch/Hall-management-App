"use client";

import React, { useEffect, useCallback, useState } from "react";
import { ApiError, fetchHalls, fetchSettings, updateHall, updateSetting } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { formatPKR } from "@/lib/format";
import type { Hall, SettingItem } from "@/lib/types";
import {
  ConnectionError,
  goldButtonClass,
  inputClass,
  labelClass,
  LoadingState,
  PageHeader,
} from "@/components/ui";

const EDITABLE: Array<{ key: string; label: string; hint: string; type?: string }> = [
  { key: "hall_day_price", label: "Day Price (PKR)", hint: "UNCONFIRMED — client se confirm karna hai (ARCHITECTURE.md Q2)." },
  { key: "hall_night_price", label: "Night Price (PKR)", hint: "Confirmed: PKR 300,000." },
  { key: "default_advance_percent", label: "Default Advance (%)", hint: "Default 50% — per booking change ho sakta hai." },
  { key: "duty_start_time", label: "Duty Start Time", hint: "Default 09:00.", type: "time" },
  { key: "late_grace_minutes", label: "Late Grace (minutes)", hint: "Default 15 — late after 09:15." },
  { key: "slot_day_start", label: "Day Slot Start", hint: "Default 12:00.", type: "time" },
  { key: "slot_day_end", label: "Day Slot End", hint: "Default 16:00.", type: "time" },
  { key: "slot_night_start", label: "Night Slot Start", hint: "Default 19:00.", type: "time" },
  { key: "slot_night_end", label: "Night Slot End", hint: "Default 23:00.", type: "time" },
];

export default function SettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [hall, setHall] = useState<Hall | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [msg, setMsg] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [guestCap, setGuestCap] = useState("");
  const [tableCap, setTableCap] = useState("");

  // Data loading lives in an Effect Event: effects may call it, and it
  // always sees the latest state without re-running the effect.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, halls] = await Promise.all([
        fetchSettings(),
        fetchHalls().catch(() => [] as Hall[]),
      ]);
      setSettings(s);
      const map: Record<string, string> = {};
      s.forEach((item) => {
        map[item.key] = item.value;
      });
      setValues(map);
      if (halls.length > 0) {
        setHall(halls[0]);
        setGuestCap(halls[0].capacity_guests === null ? "" : String(halls[0].capacity_guests));
        setTableCap(halls[0].capacity_tables === null ? "" : String(halls[0].capacity_tables));
      }
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

  const saveAll = async () => {
    setMsg("");
    setFormError("");
    setBusy(true);
    try {
      for (const item of EDITABLE) {
        const v = values[item.key];
        if (v !== undefined) await updateSetting(item.key, v);
      }
      if (hall && (guestCap !== "" || tableCap !== "")) {
        await updateHall(hall.id, {
          capacity_guests: guestCap === "" ? null : Number(guestCap),
          capacity_tables: tableCap === "" ? null : Number(tableCap),
        });
      }
      setMsg("Settings save ho gayi. Price change purani bookings par asar nahi karta — sirf nayi bookings par lagega.");
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Settings save nahi hui.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) {
    return (
      <div>
        <PageHeader title={t("settings")} />
        <ConnectionError error={error} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("settings")}
        subtitle="Hall pricing, advance, slot timings aur duty rules — sab yahan se badalte hain. Koi price code me hardcoded nahi hai."
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
                  min={0}
                  className={inputClass}
                  value={values[item.key] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.value }))}
                />
                <p className="mt-1 text-xs text-ink/50">{item.hint}</p>
              </div>
            ))}
            <p className="rounded-lg bg-offwhite px-3 py-2 text-xs text-ink/60">
              Current: Day {formatPKR(Number(values.hall_day_price || 150000))} · Night{" "}
              {formatPKR(Number(values.hall_night_price || 300000))}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
          <h2 className="font-display text-lg font-bold text-charcoal">Hall Capacity</h2>
          <p className="mt-1 text-sm text-ink/60">
            Capacity set kiye baghair table allocation enforce nahi ho sakti. Ye numbers client se
            confirm karne hain (ARCHITECTURE.md Q4) — yahan koi number invent nahi kiya gaya.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="capacity_guests" className={labelClass}>Max Guests</label>
              <input id="capacity_guests" type="number" min={1} className={inputClass} value={guestCap} onChange={(e) => setGuestCap(e.target.value)} placeholder="e.g. 500" />
            </div>
            <div>
              <label htmlFor="capacity_tables" className={labelClass}>Total Tables</label>
              <input id="capacity_tables" type="number" min={1} className={inputClass} value={tableCap} onChange={(e) => setTableCap(e.target.value)} placeholder="e.g. 50" />
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
                  onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.value }))}
                />
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
                  className={inputClass}
                  value={values[item.key] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.value }))}
                />
                <p className="mt-1 text-xs text-ink/50">{item.hint}</p>
              </div>
            ))}
          </div>
          <h3 className="mt-6 font-display text-base font-bold text-charcoal">All Settings (read-only list)</h3>
          <ul className="mt-3 space-y-1 text-xs">
            {settings.map((s) => (
              <li key={s.key} className="flex justify-between gap-3 border-b border-stone-line pb-1">
                <span className="font-mono text-ink/70">{s.key}</span>
                <span className="font-semibold text-charcoal">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
