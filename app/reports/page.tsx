"use client";

import React, { useEffect, useCallback, useState } from "react";
import { Download } from "lucide-react";
import { fetchReport } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { formatPKR, monthISO } from "@/lib/format";
import type { Booking } from "@/lib/types";
import {
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

function toCSV(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ReportKind = "bookings" | "revenue" | "outstanding" | "attendance";

export default function ReportsPage() {
  const { t } = useLanguage();
  const [kind, setKind] = useState<ReportKind>("bookings");
  const [month, setMonth] = useState(() => monthISO(new Date()));
  const [period, setPeriod] = useState("monthly");
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Data loading lives in an Effect Event: effects may call it, and it
  // always sees the latest state without re-running the effect.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { period };
      if (kind === "attendance") params.month = month;
      setData(await fetchReport(kind, params));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [kind, period, month]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [kind, period, month, load]);

  const rows: Array<Record<string, unknown>> = Array.isArray(data)
    ? (data as Array<Record<string, unknown>>)
    : [];

  const bookings = rows as unknown as Booking[];
  const totalRevenue = kind === "bookings" ? bookings.reduce((s, b) => s + (b.total_price || 0), 0) : 0;
  const totalReceived = kind === "bookings" ? bookings.reduce((s, b) => s + (b.amount_paid || 0), 0) : 0;
  const totalOutstanding = kind === "bookings" ? bookings.reduce((s, b) => s + (b.balance_amount || 0), 0) : 0;

  return (
    <div>
      <PageHeader
        title={t("reports")}
        subtitle="Bookings, revenue, outstanding aur attendance — period select karo, CSV download karo."
        actions={
          <button
            type="button"
            onClick={() => downloadCSV(`marque-one-${kind}-${month}.csv`, toCSV(rows))}
            disabled={rows.length === 0}
            data-requires-auth
            className={goldButtonClass}
          >
            <Download className="h-4 w-4" /> Download CSV
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line">
        <div>
          <label htmlFor="report_kind" className={labelClass}>Report</label>
          <select id="report_kind" value={kind} onChange={(e) => setKind(e.target.value as ReportKind)} className={inputClass}>
            <option value="bookings">Bookings</option>
            <option value="revenue">Revenue</option>
            <option value="outstanding">Outstanding Payments</option>
            <option value="attendance">Attendance</option>
          </select>
        </div>
        <div>
          <label htmlFor="report_period" className={labelClass}>Period</label>
          <select id="report_period" value={period} onChange={(e) => setPeriod(e.target.value)} className={inputClass}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
        {kind === "attendance" && (
          <div>
            <label htmlFor="report_month" className={labelClass}>Month</label>
            <input id="report_month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
          </div>
        )}
        <button type="button" onClick={load} className={secondaryButtonClass}>Refresh</button>
      </div>

      {error ? (
        <ConnectionError error={error} onRetry={() => void load()} />
      ) : loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState message="Is period ki koi report data nahi hai." />
      ) : (
        <>
          {kind === "bookings" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Bookings in Period" value={String(bookings.length)} />
              <StatCard label="Total Value" value={formatPKR(totalRevenue)} />
              <StatCard label="Outstanding" value={formatPKR(totalOutstanding)} sub={`Received: ${formatPKR(totalReceived)}`} />
            </div>
          )}
          <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
            <table className="w-full min-w-160 text-left text-sm">
              <thead>
                <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                  {Object.keys(rows[0]).slice(0, 8).map((h) => (
                    <th key={h} className="px-4 py-3">{h.replace(/_/g, " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((row, i) => (
                  <tr key={i} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                    {Object.keys(rows[0]).slice(0, 8).map((h) => (
                      <td key={h} className="max-w-48 truncate px-4 py-2.5">
                        {typeof row[h] === "number" && (h.includes("price") || h.includes("amount") || h.includes("balance") || h.includes("revenue"))
                          ? formatPKR(row[h] as number)
                          : String(row[h] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && (
              <p className="border-t border-stone-line px-4 py-3 text-xs text-ink/50">
                Showing first 100 of {rows.length} rows — poori list CSV me download karo.
              </p>
            )}
          </div>
          <p className="mt-4 text-xs text-ink/50">
            PDF export server-side hota hai (Phase 5) — yahan CSV download available hai.
          </p>
        </>
      )}
    </div>
  );
}
