"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import {
  fetchCashClosing,
  fetchOccupancy,
  fetchProfitLoss,
  fetchReport,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { formatPKR, monthISO, todayISO } from "@/lib/format";
import type { Booking, CashClosing, Occupancy, ProfitLoss } from "@/lib/types";
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

function monthBounds(month: string): [string, string] {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return [`${month}-01`, `${month}-${String(lastDay).padStart(2, "0")}`];
}

function agingBuckets(rows: Booking[]) {
  const buckets = { overdue: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const b of rows) {
    const balance = Number(b.balance_amount) || 0;
    if (balance <= 0) continue;
    const event = new Date(`${b.event_date}T00:00:00`);
    const days = Math.ceil((event.getTime() - today.getTime()) / 86400000);
    if (days < 0) buckets.overdue += balance;
    else if (days <= 30) buckets.d0_30 += balance;
    else if (days <= 60) buckets.d31_60 += balance;
    else if (days <= 90) buckets.d61_90 += balance;
    else buckets.d90plus += balance;
  }
  return buckets;
}

type ReportKind =
  | "bookings"
  | "revenue"
  | "outstanding"
  | "attendance"
  | "profit"
  | "cash"
  | "occupancy";

export default function ReportsPage() {
  const { t } = useLanguage();
  const [kind, setKind] = useState<ReportKind>("bookings");
  const [month, setMonth] = useState(() => monthISO(new Date()));
  const [period, setPeriod] = useState("monthly");
  const [cashDate, setCashDate] = useState(() => todayISO());
  const [data, setData] = useState<unknown>(null);
  const [profit, setProfit] = useState<ProfitLoss | null>(null);
  const [cash, setCash] = useState<CashClosing | null>(null);
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setProfit(null);
    setCash(null);
    setOccupancy(null);
    try {
      if (kind === "profit") {
        const [from, to] = monthBounds(month);
        setProfit(await fetchProfitLoss({ date_from: from, date_to: to }));
      } else if (kind === "cash") {
        setCash(await fetchCashClosing(cashDate));
      } else if (kind === "occupancy") {
        setOccupancy(await fetchOccupancy(month));
      } else {
        const params: Record<string, string> = { period };
        if (kind === "attendance") params.month = month;
        setData(await fetchReport(kind, params));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [kind, period, month, cashDate]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [kind, period, month, cashDate, load]);

  const rows: Array<Record<string, unknown>> = Array.isArray(data)
    ? (data as Array<Record<string, unknown>>)
    : [];
  const bookings = rows as unknown as Booking[];
  const totalRevenue = kind === "bookings" ? bookings.reduce((s, b) => s + (b.total_price || 0), 0) : 0;
  const totalReceived = kind === "bookings" ? bookings.reduce((s, b) => s + (b.amount_paid || 0), 0) : 0;
  const totalOutstanding = kind === "bookings" ? bookings.reduce((s, b) => s + (b.balance_amount || 0), 0) : 0;
  const aging = agingBuckets(bookings);
  const agingTotal = Object.values(aging).reduce((s, v) => s + v, 0);

  const table = (rowsToShow: Array<Record<string, unknown>>) => (
    <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
      <table className="w-full min-w-160 text-left text-sm">
        <thead>
          <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
            {Object.keys(rowsToShow[0]).slice(0, 8).map((h) => (
              <th key={h} className="px-4 py-3">{h.replace(/_/g, " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowsToShow.slice(0, 100).map((row, i) => (
            <tr key={i} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
              {Object.keys(rowsToShow[0]).slice(0, 8).map((h) => (
                <td key={h} className="max-w-48 truncate px-4 py-2.5">
                  {typeof row[h] === "number" &&
                  (h.includes("price") || h.includes("amount") || h.includes("balance") || h.includes("revenue"))
                    ? formatPKR(row[h] as number)
                    : String(row[h] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rowsToShow.length > 100 && (
        <p className="border-t border-stone-line px-4 py-3 text-xs text-ink/50">
          Showing first 100 of {rowsToShow.length} rows — poori list CSV me download karo.
        </p>
      )}
    </div>
  );

  const methodTable = (dataMap: Record<string, number>, label: string) => (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
            <th className="px-4 py-3">{label}</th>
            <th className="px-4 py-3 text-end">Amount</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(dataMap).length === 0 ? (
            <tr><td className="px-4 py-3 text-ink/50" colSpan={2}>No entries.</td></tr>
          ) : (
            Object.entries(dataMap).map(([key, value]) => (
              <tr key={key} className="border-b border-stone-line last:border-0">
                <td className="px-4 py-2.5 capitalize">{key.replace(/_/g, " ")}</td>
                <td className="px-4 py-2.5 text-end font-semibold">{formatPKR(value)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <PageHeader
        title={t("reports")}
        subtitle="Bookings, revenue, outstanding, profit & loss, cash closing, occupancy aur attendance — sab ek jagah."
        actions={
          <>
            <button type="button" onClick={() => window.print()} className={secondaryButtonClass}>
              <Printer className="h-4 w-4" /> Print / PDF
            </button>
            <button
              type="button"
              onClick={() => downloadCSV(`marque-one-${kind}-${month}.csv`, toCSV(rows))}
              disabled={rows.length === 0}
              data-requires-auth
              className={goldButtonClass}
            >
              <Download className="h-4 w-4" /> CSV
            </button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line">
        <div>
          <label htmlFor="report_kind" className={labelClass}>Report</label>
          <select id="report_kind" value={kind} onChange={(e) => setKind(e.target.value as ReportKind)} className={inputClass}>
            <option value="bookings">Bookings</option>
            <option value="revenue">Revenue</option>
            <option value="outstanding">Outstanding & Aging</option>
            <option value="profit">Profit & Loss</option>
            <option value="cash">Daily Cash Closing</option>
            <option value="occupancy">Occupancy</option>
            <option value="attendance">Attendance</option>
          </select>
        </div>
        {(kind === "bookings" || kind === "revenue") && (
          <div>
            <label htmlFor="report_period" className={labelClass}>Period</label>
            <select id="report_period" value={period} onChange={(e) => setPeriod(e.target.value)} className={inputClass}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        )}
        {(kind === "attendance" || kind === "profit" || kind === "occupancy") && (
          <div>
            <label htmlFor="report_month" className={labelClass}>Month</label>
            <input id="report_month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
          </div>
        )}
        {kind === "cash" && (
          <div>
            <label htmlFor="report_cash_date" className={labelClass}>Closing Date</label>
            <input id="report_cash_date" type="date" value={cashDate} onChange={(e) => setCashDate(e.target.value)} className={inputClass} />
          </div>
        )}
        <button type="button" onClick={() => void load()} className={secondaryButtonClass}>Refresh</button>
      </div>

      {error ? (
        <ConnectionError error={error} onRetry={() => void load()} />
      ) : loading ? (
        <LoadingState />
      ) : (
        <div className="print-area">
          {kind === "profit" && profit && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Net Revenue" value={formatPKR(profit.net_revenue)} sub={`Gross ${formatPKR(profit.gross_received)} − refunds ${formatPKR(profit.refunded)}`} />
                <StatCard label="Expenses" value={formatPKR(profit.expenses)} sub={`${profit.expenses_count} entries`} tone="dark" />
                <StatCard label="Profit" value={formatPKR(profit.profit)} sub={profit.profit >= 0 ? "In profit" : "In loss"} tone="gold" />
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {methodTable(profit.by_category, "Expense Category")}
                {methodTable(profit.by_method, "Received by Method")}
              </div>
            </>
          )}

          {kind === "cash" && cash && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Received" value={formatPKR(cash.total_received)} sub={cash.date} />
                <StatCard label="Refunded" value={formatPKR(cash.total_refunded)} tone="dark" />
                <StatCard label="Net Cash" value={formatPKR(cash.net_total)} tone="gold" />
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {methodTable(cash.received_by_method, "Received by Method")}
                {methodTable(cash.net_by_method, "Net by Method")}
              </div>
              {cash.transactions.length > 0 && table(cash.transactions as unknown as Array<Record<string, unknown>>)}
            </>
          )}

          {kind === "occupancy" && occupancy && (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Occupancy" value={`${occupancy.occupancy_percent}%`} tone="gold" />
                <StatCard label="Booked Slots" value={String(occupancy.booked_slots)} />
                <StatCard label="Free Slots" value={String(occupancy.free_slots)} />
                <StatCard label="Day / Night" value={`${occupancy.by_slot.day} / ${occupancy.by_slot.night}`} tone="dark" />
              </div>
              <div className="mt-6 rounded-xl bg-white p-4 text-sm text-ink/70 shadow-sm ring-1 ring-stone-line">
                {occupancy.month} mein total {occupancy.total_slots} slots me se {occupancy.booked_slots} booked hain.
              </div>
            </>
          )}

          {(kind === "bookings" || kind === "revenue" || kind === "outstanding" || kind === "attendance") &&
            (rows.length === 0 ? (
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
                {kind === "outstanding" && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                      <StatCard label="Total Due" value={formatPKR(agingTotal)} tone="dark" />
                      <StatCard label="Overdue" value={formatPKR(aging.overdue)} tone="gold" />
                      <StatCard label="0–30 days" value={formatPKR(aging.d0_30)} />
                      <StatCard label="31–60 days" value={formatPKR(aging.d31_60)} />
                      <StatCard label="61–90 days" value={formatPKR(aging.d61_90)} />
                      <StatCard label="90+ days" value={formatPKR(aging.d90plus)} />
                    </div>
                    <p className="mt-3 text-xs text-ink/50">Aging event date ke hisaab se hai — overdue ka matlab event date guzar chuki hai.</p>
                  </>
                )}
                {table(rows)}
              </>
            ))}
        </div>
      )}
    </div>
  );
}
