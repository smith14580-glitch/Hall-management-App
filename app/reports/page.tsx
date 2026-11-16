"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Percent,
  Printer,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  asArray,
  fetchCashClosing,
  fetchOccupancy,
  fetchProfitLoss,
  fetchReport,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import {
  cn,
  formatDate,
  formatPKR,
  formatWorkingMinutes,
  monthISO,
  todayISO,
} from "@/lib/format";
import type { CashClosing, Occupancy, ProfitLoss } from "@/lib/types";
import {
  Badge,
  CardsSkeleton,
  ConnectionError,
  goldButtonClass,
  inputClass,
  labelClass,
  PageHeader,
  paymentStatusTone,
  secondaryButtonClass,
  StatCard,
  TableSkeleton,
} from "@/components/ui";

interface ReportBooking {
  booking_code: string;
  event_type: string;
  event_date: string;
  slot: string;
  guest_count: number;
  total_price: number;
  amount_paid: number;
  balance_amount: number;
  payment_status: string;
  status: string;
}

interface ReportAttendance {
  employee_name: string;
  employee_code: string;
  attendance_date: string;
  status: string;
  is_late: boolean;
  late_minutes: number | null;
  working_minutes: number | null;
}

type ReportKind =
  | "bookings"
  | "revenue"
  | "outstanding"
  | "attendance"
  | "profit"
  | "cash"
  | "occupancy";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function num(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function numMap(map: Record<string, number> | null | undefined): Record<string, number> {
  return Object.fromEntries(Object.entries(map ?? {}).map(([key, value]) => [key, num(value)]));
}

function normalizeBookings(data: unknown): ReportBooking[] {
  return asArray<Record<string, unknown>>(data).map((row) => ({
    booking_code: row.booking_code == null ? "—" : String(row.booking_code),
    event_type: row.event_type == null ? "—" : String(row.event_type),
    event_date: row.event_date == null ? "" : String(row.event_date),
    slot: row.slot == null ? "—" : String(row.slot),
    guest_count: num(row.guest_count),
    total_price: num(row.total_price),
    amount_paid: num(row.amount_paid),
    balance_amount: num(row.balance_amount),
    payment_status: row.payment_status == null ? "" : String(row.payment_status),
    status: row.status == null ? "" : String(row.status),
  }));
}

function normalizeAttendance(data: unknown): ReportAttendance[] {
  return asArray<Record<string, unknown>>(data).map((row) => ({
    employee_name: row.employee_name == null ? "—" : String(row.employee_name),
    employee_code: row.employee_code == null ? "—" : String(row.employee_code),
    attendance_date: row.attendance_date == null ? "" : String(row.attendance_date),
    status: row.status == null ? "" : String(row.status),
    is_late: Boolean(row.is_late),
    late_minutes: row.late_minutes == null ? null : num(row.late_minutes),
    working_minutes: row.working_minutes == null ? null : num(row.working_minutes),
  }));
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y || 2000, (m || 1) - 1, d || 1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - day);
  return next;
}

function endOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${pad2(last)}`;
}

function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[(m || 1) - 1]} '${String(y || 2000).slice(2)}`;
}

function periodBounds(period: string, month: string, anchor: string): [string | null, string | null] {
  switch (period) {
    case "daily":
      return [anchor, anchor];
    case "weekly": {
      const start = startOfWeek(parseDateOnly(anchor));
      return [isoDate(start), isoDate(addDays(start, 6))];
    }
    case "monthly":
      return [`${month}-01`, endOfMonth(month)];
    case "annual": {
      const year = month.slice(0, 4);
      return [`${year}-01-01`, `${year}-12-31`];
    }
    default:
      return [null, null];
  }
}

function chartMonths(period: string, month: string, anchorMonth: string): string[] {
  if (period === "all") return [];
  if (period === "annual") {
    const year = month.slice(0, 4);
    return Array.from({ length: 12 }, (_, i) => `${year}-${pad2(i + 1)}`);
  }
  const end = period === "monthly" ? month : anchorMonth;
  return Array.from({ length: 6 }, (_, i) => addMonths(end, i - 5));
}

function fetchBounds(period: string, month: string, anchor: string): [string | null, string | null] {
  const [tableFrom, tableTo] = periodBounds(period, month, anchor);
  if (!tableFrom || !tableTo) return [null, null];
  const anchorMonth = period === "monthly" || period === "annual" ? month : anchor.slice(0, 7);
  const months = chartMonths(period, month, anchorMonth);
  const chartFrom = months.length ? `${months[0]}-01` : tableFrom;
  const chartTo = months.length ? endOfMonth(months[months.length - 1]) : tableTo;
  return [
    tableFrom < chartFrom ? tableFrom : chartFrom,
    tableTo > chartTo ? tableTo : chartTo,
  ];
}

function monthBounds(month: string): [string, string] {
  return [`${month}-01`, endOfMonth(month)];
}

function agingBuckets(rows: ReportBooking[]) {
  const buckets = { overdue: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const b of rows) {
    if (b.balance_amount <= 0) continue;
    const event = parseDateOnly(b.event_date);
    if (Number.isNaN(event.getTime())) continue;
    const days = Math.ceil((event.getTime() - today.getTime()) / 86400000);
    const balance = num(b.balance_amount);
    if (days < 0) buckets.overdue += balance;
    else if (days <= 30) buckets.d0_30 += balance;
    else if (days <= 60) buckets.d31_60 += balance;
    else if (days <= 90) buckets.d61_90 += balance;
    else buckets.d90plus += balance;
  }
  return buckets;
}

function paymentLabel(status: string): string {
  if (status === "fully_paid") return "Paid";
  if (status === "partially_paid") return "Partial";
  if (status === "unpaid") return "Unpaid";
  return status || "—";
}

function attendanceTone(status: string): "green" | "red" | "amber" | "blue" | "grey" {
  if (status === "present") return "green";
  if (status === "absent") return "red";
  if (status === "leave") return "blue";
  if (status === "half_day") return "amber";
  return "grey";
}

function toCSV(rows: Array<Record<string, unknown>>, headers: string[]): string {
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

export default function ReportsPage() {
  const { t } = useLanguage();
  const [kind, setKind] = useState<ReportKind>("bookings");
  const [month, setMonth] = useState(() => monthISO(new Date()));
  const [period, setPeriod] = useState("monthly");
  const [anchor, setAnchor] = useState(() => todayISO());
  const [cashDate, setCashDate] = useState(() => todayISO());
  const [rows, setRows] = useState<ReportBooking[]>([]);
  const [attendance, setAttendance] = useState<ReportAttendance[]>([]);
  const [profit, setProfit] = useState<ProfitLoss | null>(null);
  const [cash, setCash] = useState<CashClosing | null>(null);
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRows([]);
    setAttendance([]);
    setProfit(null);
    setCash(null);
    setOccupancy(null);
    try {
      if (kind === "profit") {
        const [from, to] = monthBounds(month);
        const res = await fetchProfitLoss({ date_from: from, date_to: to });
        setProfit({
          ...res,
          gross_received: num(res.gross_received),
          refunded: num(res.refunded),
          net_revenue: num(res.net_revenue),
          expenses: num(res.expenses),
          profit: num(res.profit),
          by_category: numMap(res.by_category),
          by_method: numMap(res.by_method),
          payments_count: num(res.payments_count),
          refunds_count: num(res.refunds_count),
          expenses_count: num(res.expenses_count),
        });
      } else if (kind === "cash") {
        const res = await fetchCashClosing(cashDate);
        setCash({
          ...res,
          received_by_method: numMap(res.received_by_method),
          refunded_by_method: numMap(res.refunded_by_method),
          net_by_method: numMap(res.net_by_method),
          total_received: num(res.total_received),
          total_refunded: num(res.total_refunded),
          net_total: num(res.net_total),
          transactions: (res.transactions ?? []).map((tr) => ({
            ...tr,
            amount: num(tr.amount),
          })),
        });
      } else if (kind === "occupancy") {
        const [res, monthBookings] = await Promise.all([
          fetchOccupancy(month),
          fetchReport("bookings", { date_from: `${month}-01`, date_to: endOfMonth(month) }),
        ]);
        setRows(normalizeBookings(monthBookings));
        setOccupancy({
          ...res,
          total_slots: num(res.total_slots),
          booked_slots: num(res.booked_slots),
          free_slots: num(res.free_slots),
          occupancy_percent: num(res.occupancy_percent),
          by_slot: { day: num(res.by_slot?.day), night: num(res.by_slot?.night) },
        });
      } else if (kind === "attendance") {
        setAttendance(normalizeAttendance(await fetchReport("attendance", { month })));
      } else if (kind === "outstanding") {
        setRows(normalizeBookings(await fetchReport("outstanding")));
      } else {
        const [from, to] = fetchBounds(period, month, anchor);
        const params: Record<string, string> = {};
        if (from && to) {
          params.date_from = from;
          params.date_to = to;
        }
        setRows(normalizeBookings(await fetchReport("bookings", params)));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [kind, period, month, anchor, cashDate]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const tableRows = useMemo(() => {
    if (kind !== "bookings" && kind !== "revenue") return rows;
    const [from, to] = periodBounds(period, month, anchor);
    if (!from || !to) return rows;
    return rows.filter((b) => b.event_date && b.event_date >= from && b.event_date <= to);
  }, [rows, kind, period, month, anchor]);

  const chartKeys = useMemo(() => {
    if (kind !== "bookings" && kind !== "revenue") return [];
    if (period === "all") {
      const keys = Array.from(new Set(rows.map((b) => b.event_date.slice(0, 7)).filter(Boolean))).sort();
      return keys.slice(-12);
    }
    const anchorMonth = period === "monthly" || period === "annual" ? month : anchor.slice(0, 7);
    return chartMonths(period, month, anchorMonth);
  }, [rows, kind, period, month, anchor]);

  const chartData = useMemo(() => {
    const totals = new Map(chartKeys.map((key) => [key, 0]));
    for (const b of rows) {
      const key = b.event_date.slice(0, 7);
      if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + num(b.amount_paid));
    }
    return chartKeys.map((key) => [key, totals.get(key) ?? 0] as [string, number]);
  }, [rows, chartKeys]);

  const bookingTotals = useMemo(
    () =>
      tableRows.reduce(
        (acc, b) => {
          acc.value += num(b.total_price);
          acc.paid += num(b.amount_paid);
          acc.balance += num(b.balance_amount);
          return acc;
        },
        { value: 0, paid: 0, balance: 0 },
      ),
    [tableRows],
  );

  const aging = useMemo(() => agingBuckets(rows), [rows]);
  const agingTotal = Object.values(aging).reduce((s, v) => s + v, 0);

  const attendanceTotals = useMemo(
    () =>
      attendance.reduce(
        (acc, row) => {
          if (row.status === "present" || row.status === "half_day") acc.present += 1;
          if (row.status === "absent") acc.absent += 1;
          if (row.is_late) acc.late += 1;
          return acc;
        },
        { present: 0, absent: 0, late: 0 },
      ),
    [attendance],
  );

  const chartMax = Math.max(...chartData.map(([, value]) => value), 1);

  const buildExport = useCallback(() => {
    if (kind === "attendance") {
      return {
        filename: `marque-one-attendance-${month}`,
        headers: ["employee_name", "employee_code", "attendance_date", "status", "is_late", "late_minutes", "working_minutes"],
        rows: attendance.map((row) => ({
          employee_name: row.employee_name,
          employee_code: row.employee_code,
          attendance_date: row.attendance_date,
          status: row.status,
          is_late: row.is_late ? "yes" : "no",
          late_minutes: row.late_minutes ?? "",
          working_minutes: row.working_minutes ?? "",
        })),
      };
    }
    if (kind === "cash") {
      return {
        filename: `marque-one-cash-${cashDate}`,
        headers: ["type", "method", "amount", "reference", "receipt_number", "booking_id"],
        rows: (cash?.transactions ?? []).map((tr) => ({
          type: tr.type,
          method: tr.method,
          amount: num(tr.amount),
          reference: tr.reference ?? "",
          receipt_number: tr.receipt_number ?? "",
          booking_id: tr.booking_id ?? "",
        })),
      };
    }
    if (kind === "profit") {
      return {
        filename: `marque-one-profit-${month}`,
        headers: ["metric", "amount"],
        rows: [
          { metric: "gross_received", amount: num(profit?.gross_received) },
          { metric: "refunded", amount: num(profit?.refunded) },
          { metric: "net_revenue", amount: num(profit?.net_revenue) },
          { metric: "expenses", amount: num(profit?.expenses) },
          { metric: "profit", amount: num(profit?.profit) },
        ],
      };
    }
    if (kind === "occupancy") {
      return {
        filename: `marque-one-occupancy-${month}`,
        headers: ["metric", "value"],
        rows: [
          { metric: "month", value: occupancy?.month ?? month },
          { metric: "total_slots", value: num(occupancy?.total_slots) },
          { metric: "booked_slots", value: num(occupancy?.booked_slots) },
          { metric: "free_slots", value: num(occupancy?.free_slots) },
          { metric: "occupancy_percent", value: num(occupancy?.occupancy_percent) },
        ],
      };
    }
    return {
      filename: `marque-one-${kind}-${kind === "bookings" || kind === "revenue" ? period : "all"}`,
      headers: ["booking_code", "event_type", "event_date", "slot", "guest_count", "total_price", "amount_paid", "balance_amount", "payment_status", "status"],
      rows: tableRows.map((b) => ({
        booking_code: b.booking_code,
        event_type: b.event_type,
        event_date: b.event_date,
        slot: b.slot,
        guest_count: b.guest_count,
        total_price: b.total_price,
        amount_paid: b.amount_paid,
        balance_amount: b.balance_amount,
        payment_status: b.payment_status,
        status: b.status,
      })),
    };
  }, [kind, month, cashDate, attendance, cash, profit, occupancy, tableRows, period]);

  const exportCount =
    kind === "attendance"
      ? attendance.length
      : kind === "cash"
        ? cash?.transactions.length ?? 0
        : kind === "profit"
          ? profit
            ? 1
            : 0
          : kind === "occupancy"
            ? occupancy
              ? 1
              : 0
            : tableRows.length;

  const bookingTable = (rowsToShow: ReportBooking[], emptyMessage: string) => (
    <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[58rem] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-offwhite">
            <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Slot</th>
              <th className="px-4 py-3 text-right">Guests</th>
              <th className="px-4 py-3 text-right">Total Price</th>
              <th className="px-4 py-3 text-right">Amount Paid</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rowsToShow.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-ink/50">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rowsToShow.map((b) => (
                <tr key={b.booking_code} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-charcoal">{b.booking_code}</td>
                  <td className="px-4 py-2.5">{b.event_type}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{formatDate(b.event_date)}</td>
                  <td className="px-4 py-2.5 capitalize">{b.slot}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{b.guest_count.toLocaleString("en-US")}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{formatPKR(b.total_price)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{formatPKR(b.amount_paid)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums">{formatPKR(b.balance_amount)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <Badge tone={paymentStatusTone(b.payment_status)}>{paymentLabel(b.payment_status)}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const attendanceTable = (rowsToShow: ReportAttendance[]) => (
    <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-offwhite">
            <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Late</th>
              <th className="px-4 py-3 text-right">Working</th>
            </tr>
          </thead>
          <tbody>
            {rowsToShow.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink/50">
                  No attendance records in this period.
                </td>
              </tr>
            ) : (
              rowsToShow.map((row, i) => (
                <tr key={`${row.employee_code}-${row.attendance_date}-${i}`} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-charcoal">{row.employee_name}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{row.employee_code}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{formatDate(row.attendance_date)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={attendanceTone(row.status)}>{row.status.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    {row.is_late ? (
                      <span className="text-amber-700">{row.late_minutes != null ? `${row.late_minutes} min late` : "Late"}</span>
                    ) : (
                      <span className="text-ink/40">On time</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatWorkingMinutes(row.working_minutes)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const genericTable = (rowsToShow: Array<Record<string, unknown>>) => {
    if (rowsToShow.length === 0) {
      return (
        <div className="mt-6 rounded-xl bg-white p-10 text-center text-sm text-ink/50 shadow-sm ring-1 ring-stone-line">
          No transactions for this period.
        </div>
      );
    }
    const headers = Object.keys(rowsToShow[0]).slice(0, 8);
    return (
      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-offwhite">
              <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3">
                    {h.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsToShow.map((row, i) => (
                <tr key={i} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                  {headers.map((h) => {
                    const value = row[h];
                    const isMoney =
                      typeof value === "number" &&
                      (h.includes("price") || h.includes("amount") || h.includes("balance") || h.includes("revenue"));
                    return (
                      <td key={h} className={cn("max-w-56 truncate px-4 py-2.5", isMoney && "text-right tabular-nums")}>
                        {isMoney ? formatPKR(value) : String(value ?? "—")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const occupancySlots = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const b of rows) {
      if (!b.event_date.startsWith(month)) continue;
      const slots = map.get(b.event_date) ?? new Set<string>();
      slots.add(b.slot);
      map.set(b.event_date, slots);
    }
    return map;
  }, [rows, month]);

  const isBookingReport = kind === "bookings" || kind === "revenue";
  const showAnchor = isBookingReport && (period === "daily" || period === "weekly");
  const showMonthPicker = isBookingReport
    ? period === "monthly" || period === "annual"
    : kind === "attendance" || kind === "profit" || kind === "occupancy";

  const methodTable = (dataMap: Record<string, number>, label: string) => (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-offwhite">
          <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
            <th className="px-4 py-3">{label}</th>
            <th className="px-4 py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(dataMap).length === 0 ? (
            <tr>
              <td className="px-4 py-3 text-ink/50" colSpan={2}>
                No entries.
              </td>
            </tr>
          ) : (
            Object.entries(dataMap).map(([key, value]) => (
              <tr key={key} className="border-b border-stone-line last:border-0">
                <td className="px-4 py-2.5 capitalize">{key.replace(/_/g, " ")}</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatPKR(value)}</td>
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
              onClick={() => {
                const { filename, headers, rows: csvRows } = buildExport();
                downloadCSV(`${filename}.csv`, toCSV(csvRows, headers));
              }}
              disabled={exportCount === 0}
              data-requires-auth
              className={goldButtonClass}
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line">
        <div className="min-w-40 flex-1 sm:flex-none">
          <label htmlFor="report_kind" className={labelClass}>
            Report
          </label>
          <select id="report_kind" value={kind} onChange={(e) => setKind(e.target.value as ReportKind)} className={inputClass}>
            <option value="bookings">Bookings</option>
            <option value="revenue">Revenue</option>
            <option value="outstanding">Outstanding &amp; Aging</option>
            <option value="profit">Profit &amp; Loss</option>
            <option value="cash">Daily Cash Closing</option>
            <option value="occupancy">Occupancy</option>
            <option value="attendance">Attendance</option>
          </select>
        </div>
        {isBookingReport && (
          <div className="min-w-32">
            <label htmlFor="report_period" className={labelClass}>
              Period
            </label>
            <select id="report_period" value={period} onChange={(e) => setPeriod(e.target.value)} className={inputClass}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
              <option value="all">All</option>
            </select>
          </div>
        )}
        {showAnchor && (
          <div>
            <label htmlFor="report_anchor" className={labelClass}>
              {period === "daily" ? "Day" : "Week of"}
            </label>
            <input id="report_anchor" type="date" value={anchor} onChange={(e) => setAnchor(e.target.value || todayISO())} className={inputClass} />
          </div>
        )}
        {showMonthPicker && (
          <div>
            <label htmlFor="report_month" className={labelClass}>
              {isBookingReport && period === "annual" ? "Year (pick any month)" : "Month"}
            </label>
            <input id="report_month" type="month" value={month} onChange={(e) => setMonth(e.target.value || monthISO(new Date()))} className={inputClass} />
          </div>
        )}
        {kind === "cash" && (
          <div>
            <label htmlFor="report_cash_date" className={labelClass}>
              Closing Date
            </label>
            <input id="report_cash_date" type="date" value={cashDate} onChange={(e) => setCashDate(e.target.value || todayISO())} className={inputClass} />
          </div>
        )}
        <button type="button" onClick={() => void load()} className={secondaryButtonClass}>
          Refresh
        </button>
      </div>

      {error ? (
        <ConnectionError error={error} onRetry={() => void load()} />
      ) : loading ? (
        <div className="space-y-5">
          <CardsSkeleton count={kind === "profit" || kind === "cash" ? 3 : 4} />
          <TableSkeleton rows={6} cols={8} />
        </div>
      ) : (
        <div className="print-area">
          {kind === "profit" && profit && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Net Revenue"
                  value={formatPKR(profit.net_revenue)}
                  sub={`Gross ${formatPKR(profit.gross_received)} − refunds ${formatPKR(profit.refunded)}`}
                  icon={<TrendingUp className="h-5 w-5" />}
                />
                <StatCard
                  label="Expenses"
                  value={formatPKR(profit.expenses)}
                  sub={`${num(profit.expenses_count)} entries`}
                  tone="dark"
                  icon={<Receipt className="h-5 w-5" />}
                />
                <StatCard
                  label="Profit"
                  value={formatPKR(profit.profit)}
                  sub={profit.profit >= 0 ? "In profit" : "In loss"}
                  tone="gold"
                  icon={<Banknote className="h-5 w-5" />}
                />
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {methodTable(profit.by_category, "Expense Category")}
                {methodTable(profit.by_method, "Received by Method")}
              </div>
            </>
          )}

          {kind === "cash" && cash && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Received"
                  value={formatPKR(cash.total_received)}
                  sub={cash.date}
                  icon={<Wallet className="h-5 w-5" />}
                />
                <StatCard label="Refunded" value={formatPKR(cash.total_refunded)} tone="dark" icon={<Receipt className="h-5 w-5" />} />
                <StatCard label="Net Cash" value={formatPKR(cash.net_total)} tone="gold" icon={<Banknote className="h-5 w-5" />} />
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {methodTable(cash.received_by_method, "Received by Method")}
                {methodTable(cash.net_by_method, "Net by Method")}
              </div>
              {genericTable(cash.transactions as unknown as Array<Record<string, unknown>>)}
            </>
          )}

          {kind === "occupancy" && occupancy && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                  label="Occupancy"
                  value={`${num(occupancy.occupancy_percent)}%`}
                  tone="gold"
                  icon={<Percent className="h-5 w-5" />}
                />
                <StatCard label="Booked Slots" value={String(num(occupancy.booked_slots))} icon={<CalendarDays className="h-5 w-5" />} />
                <StatCard label="Free Slots" value={String(num(occupancy.free_slots))} icon={<CalendarDays className="h-5 w-5" />} />
                <StatCard
                  label="Day / Night"
                  value={`${num(occupancy.by_slot?.day)} / ${num(occupancy.by_slot?.night)}`}
                  tone="dark"
                  icon={<Users className="h-5 w-5" />}
                />
              </div>
              <div className="mt-6 rounded-xl bg-white p-4 text-sm text-ink/70 shadow-sm ring-1 ring-stone-line">
                {monthLabel(occupancy.month || month)} mein total {num(occupancy.total_slots)} slots me se {num(occupancy.booked_slots)} booked hain.
              </div>
              <div className="mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-bold text-charcoal">Slot heatmap</h2>
                    <p className="text-xs text-ink/50">Har din ka day/night slot — khaali din jaldi pick karo.</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-semibold text-ink/60">
                    <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-gold" /> Day</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-charcoal" /> Night</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-stone-200" /> Free</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
                  {Array.from({ length: daysInMonth(month) }, (_, i) => {
                    const day = i + 1;
                    const key = `${month}-${pad2(day)}`;
                    const slots = occupancySlots.get(key);
                    const dayBooked = slots?.has("day") ?? false;
                    const nightBooked = slots?.has("night") ?? false;
                    return (
                      <div key={key} className="rounded-lg border border-stone-line bg-offwhite p-1.5 text-center" title={`${day} ${monthLabel(month)} — day ${dayBooked ? "booked" : "free"}, night ${nightBooked ? "booked" : "free"}`}>
                        <span className="text-[10px] font-semibold text-ink/60">{day}</span>
                        <div className="mt-1 flex justify-center gap-0.5">
                          <span className={`h-2 w-2.5 rounded-sm ${dayBooked ? "bg-gold" : "bg-stone-200"}`} />
                          <span className={`h-2 w-2.5 rounded-sm ${nightBooked ? "bg-charcoal" : "bg-stone-200"}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {kind === "attendance" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <StatCard
                  label="Records"
                  value={String(attendance.length)}
                  icon={<CalendarDays className="h-5 w-5" />}
                />
                <StatCard
                  label="Present"
                  value={String(attendanceTotals.present)}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                />
                <StatCard label="Absent" value={String(attendanceTotals.absent)} tone="dark" icon={<XCircle className="h-5 w-5" />} />
                <StatCard label="Late" value={String(attendanceTotals.late)} tone="gold" icon={<Clock className="h-5 w-5" />} />
              </div>
              {attendanceTable(attendance)}
            </>
          )}

          {(kind === "bookings" || kind === "revenue" || kind === "outstanding") && (
            <>
              {kind === "outstanding" ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
                    <StatCard label="Total Due" value={formatPKR(agingTotal)} tone="dark" icon={<AlertCircle className="h-5 w-5" />} />
                    <StatCard label="Overdue" value={formatPKR(aging.overdue)} tone="gold" icon={<Clock className="h-5 w-5" />} />
                    <StatCard label="0–30 days" value={formatPKR(aging.d0_30)} />
                    <StatCard label="31–60 days" value={formatPKR(aging.d31_60)} />
                    <StatCard label="61–90 days" value={formatPKR(aging.d61_90)} />
                    <StatCard label="90+ days" value={formatPKR(aging.d90plus)} />
                  </div>
                  <p className="mt-3 text-xs text-ink/50">
                    Aging event date ke hisaab se hai — overdue ka matlab event date guzar chuki hai.
                  </p>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                    <StatCard
                      label="Bookings in Period"
                      value={String(tableRows.length)}
                      sub={kind === "revenue" ? "Bookings with collected revenue" : undefined}
                      icon={<CalendarDays className="h-5 w-5" />}
                    />
                    <StatCard
                      label="Total Value"
                      value={formatPKR(bookingTotals.value)}
                      sub="Sum of total price"
                      tone="dark"
                      icon={<TrendingUp className="h-5 w-5" />}
                    />
                    <StatCard
                      label="Collected"
                      value={formatPKR(bookingTotals.paid)}
                      sub="Sum of amount paid"
                      icon={<Wallet className="h-5 w-5" />}
                    />
                    <StatCard
                      label="Outstanding"
                      value={formatPKR(bookingTotals.balance)}
                      sub="Sum of balance amount"
                      tone="gold"
                      icon={<AlertCircle className="h-5 w-5" />}
                    />
                  </div>

                  <div className="mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="font-display text-base font-bold text-charcoal">Monthly revenue</h2>
                        <p className="text-xs text-ink/50">
                          Collected amount per month —{" "}
                          {period === "annual"
                            ? `year ${month.slice(0, 4)}`
                            : period === "all"
                              ? "all recorded months"
                              : `last 6 months to ${monthLabel(period === "monthly" ? month : anchor.slice(0, 7))}`}
                        </p>
                      </div>
                      <BarChart3 className="h-5 w-5 text-gold" />
                    </div>
                    {chartData.length === 0 ? (
                      <p className="mt-4 text-sm text-ink/50">No revenue data in this period.</p>
                    ) : (
                      <div className="mt-4 space-y-2.5">
                        {chartData.map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 sm:gap-3" title={`${monthLabel(key)}: ${formatPKR(value)}`}>
                            <span className="w-14 shrink-0 text-xs font-semibold text-ink/60">{monthLabel(key)}</span>
                            <div className="h-4 flex-1 overflow-hidden rounded-full bg-stone-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-gold-dark to-gold"
                                style={{ width: `${value > 0 ? Math.max(2, Math.round((value / chartMax) * 100)) : 0}%` }}
                              />
                            </div>
                            <span className="w-28 shrink-0 text-right text-xs font-semibold tabular-nums text-charcoal sm:w-32">
                              {formatPKR(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              {bookingTable(
                tableRows,
                kind === "outstanding" ? "No outstanding balances." : "No bookings in this period.",
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
