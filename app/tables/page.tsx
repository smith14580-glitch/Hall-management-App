"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { ApiError, activateTable, createTable, deactivateTable, fetchHalls, fetchTables } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import type { HallTable } from "@/lib/types";
import {
  Badge,
  ConnectionError,
  EmptyState,
  goldButtonClass,
  inputClass,
  labelClass,
  LoadingState,
  PageHeader,
  secondaryButtonClass,
  StatCard,
} from "@/components/ui";

export default function TablesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<HallTable[]>([]);
  const [hallCapacity, setHallCapacity] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [formError, setFormError] = useState("");
  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState(10);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tbls, halls] = await Promise.all([
        fetchTables(),
        fetchHalls().catch(() => []),
      ]);
      setRows(tbls);
      setHallCapacity(halls[0]?.capacity_tables ?? null);
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

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!number.trim()) {
      setFormError("Table number likho (jaise T-13).");
      return;
    }
    if (capacity < 1) {
      setFormError("Capacity kam az kam 1 honi chahiye.");
      return;
    }
    setBusy(true);
    try {
      await createTable({ table_number: number.trim(), capacity });
      setNumber("");
      setCapacity(10);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Table add nahi hui.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (row: HallTable) => {
    setFormError("");
    try {
      if (row.is_active) {
        await deactivateTable(row.id);
      } else {
        await activateTable(row.id);
      }
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Update nahi ho saka.");
    }
  };

  const activeTables = rows.filter((r) => r.is_active);
  const totalSeats = activeTables.reduce((s, r) => s + r.capacity, 0);

  return (
    <div>
      <PageHeader
        title={t("tables")}
        subtitle="Har table ka number aur guest capacity. Allocation booking detail page se hoti hai."
      />

      {error ? (
        <ConnectionError error={error} onRetry={() => void load()} />
      ) : loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Tables" value={String(rows.length)} sub={`${activeTables.length} active`} />
            <StatCard label="Total Seats" value={String(totalSeats)} sub="Sum of active table capacities" />
            <StatCard label="Hall Capacity (tables)" value={hallCapacity === null ? "Not set" : String(hallCapacity)} sub={hallCapacity === null ? "Settings me capacity set karo — tab tak allocation kaam nahi karegi." : "Set in hall settings"} />
          </div>

          {hallCapacity === null && (
            <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Hall capacity abhi set nahi hai (ARCHITECTURE.md Q4). Capacity set kiye baghair table
              allocation enforce nahi ho sakti — Settings / hall details me capacity_tables bharo.
            </p>
          )}

          <form onSubmit={onAdd} className="mt-6 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line">
            <div>
              <label htmlFor="table_number" className={labelClass}>Table Number *</label>
              <input id="table_number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="T-13" className={inputClass} />
            </div>
            <div>
              <label htmlFor="table_capacity" className={labelClass}>Seats *</label>
              <input id="table_capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className={inputClass} />
            </div>
            <button type="submit" data-requires-auth disabled={busy} className={goldButtonClass}>
              <Plus className="h-4 w-4" /> {busy ? "Adding…" : t("addTable")}
            </button>
            {formError && <p className="w-full text-sm text-red-600" role="alert">{formError}</p>}
          </form>

          <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
            {rows.length === 0 ? (
              <EmptyState message="No tables yet — upar se pehli table add karo." />
            ) : (
              <table className="w-full min-w-120 text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                    <th className="px-5 py-3">Table</th>
                    <th className="px-5 py-3">Capacity</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                      <td className="px-5 py-3 font-display text-lg font-bold text-charcoal">{row.table_number}</td>
                      <td className="px-5 py-3">{row.capacity} guests</td>
                      <td className="px-5 py-3">
                        <Badge tone={row.is_active ? "green" : "grey"}>{row.is_active ? t("active") : t("inactive")}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <button type="button" data-requires-auth onClick={() => toggleActive(row)} className={secondaryButtonClass}>
                          {row.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
