"use client";

import React, { useEffect, useCallback, useState } from "react";
import { CheckCircle2, Clock, LogIn, LogOut, UserX } from "lucide-react";
import {
  ApiError,
  checkIn,
  checkOut,
  fetchAttendance,
  fetchEmployees,
  fetchMyAttendance,
  fetchTodayAttendance,
  markAttendance,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { formatDate, formatTime, formatWorkingMinutes, monthISO, todayISO } from "@/lib/format";
import type { AttendanceRow, Employee } from "@/lib/types";
import {
  Badge,
  ConnectionError,
  EmptyState,
  goldButtonClass,
  inputClass,
  labelClass,
  LoadingState,
  PageHeader,
  primaryButtonClass,
  secondaryButtonClass,
  StatCard,
} from "@/components/ui";

export default function AttendancePage() {
  const { user, isManager } = useAuth();
  const { t } = useLanguage();
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [myRows, setMyRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [actionMsg, setActionMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(() => monthISO(new Date()));
  const [clock, setClock] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [markEmp, setMarkEmp] = useState("");
  const [markStatus, setMarkStatus] = useState("absent");

  // Data loading lives in an Effect Event: effects may call it, and it
  // always sees the latest state without re-running the effect.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isManager) {
        const [today, monthly, emps] = await Promise.all([
          fetchTodayAttendance(),
          fetchAttendance(month),
          fetchEmployees().catch(() => [] as Employee[]),
        ]);
        setRows(today);
        setMyRows(monthly);
        setEmployees(emps);
      } else {
        setMyRows(await fetchMyAttendance(month));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [isManager, month]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [isManager, month, load]);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat("en-GB", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "Asia/Karachi",
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const todayRow = myRows.find((r) => r.attendance_date === todayISO());
  const checkedIn = !!todayRow?.check_in_at && !todayRow?.check_out_at;
  const checkedOut = !!todayRow?.check_out_at;

  const doCheckIn = async () => {
    setActionMsg("");
    setActionError("");
    setBusy(true);
    try {
      const row = await checkIn();
      setActionMsg(`Check-in ho gaya — ${formatTime(row.check_in_at)}${row.is_late ? " (Late)" : ""}`);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Check-in nahi ho saka.");
    } finally {
      setBusy(false);
    }
  };

  const doCheckOut = async () => {
    setActionMsg("");
    setActionError("");
    setBusy(true);
    try {
      const row = await checkOut();
      setActionMsg(`Check-out ho gaya — working time ${formatWorkingMinutes(row.working_minutes)}.`);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Check-out nahi ho saka.");
    } finally {
      setBusy(false);
    }
  };

  const doMark = async () => {
    if (!markEmp) return;
    setActionError("");
    try {
      await markAttendance({ employee_id: markEmp, attendance_date: todayISO(), status: markStatus });
      setActionMsg("Attendance mark kar di gayi.");
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Mark nahi ho saka.");
    }
  };

  const presentToday = rows.filter((r) => r.status === "present").length;
  const lateToday = rows.filter((r) => r.is_late).length;
  const absentToday = rows.filter((r) => r.status === "absent").length;

  return (
    <div>
      <PageHeader
        title={t("attendance")}
        subtitle={isManager ? "Aaj ki attendance, history aur monthly report." : "Apni aaj ki attendance yahan se mark karo."}
      />

      {error ? (
        <ConnectionError error={error} onRetry={() => void load()} />
      ) : loading ? (
        <LoadingState />
      ) : (
        <>
          {/* Staff / waiter view — big touch-friendly buttons */}
          {!isManager && (
            <div className="mx-auto max-w-lg">
              <div className="rounded-2xl bg-charcoal p-6 text-center text-white shadow-sm">
                <p className="flex items-center justify-center gap-2 text-sm text-white/60">
                  <Clock className="h-4 w-4" /> {formatDate(todayISO())}
                </p>
                <p className="mt-2 font-display text-4xl font-bold tabular-nums">{clock}</p>
                <p className="mt-2 text-sm text-white/70">{user?.full_name}</p>
                <div className="mt-4">
                  {checkedOut ? (
                    <p className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-3 font-semibold text-emerald-300">
                      <CheckCircle2 className="h-5 w-5" /> Aaj ka kaam mukammal — check-out {formatTime(todayRow?.check_out_at)}
                    </p>
                  ) : checkedIn ? (
                    <p className="rounded-lg bg-emerald-500/20 px-4 py-3 font-semibold text-emerald-300">
                      Checked In — {formatTime(todayRow?.check_in_at)}
                      {todayRow?.is_late ? ` · Late (${todayRow.late_minutes} min)` : ""}
                    </p>
                  ) : (
                    <p className="rounded-lg bg-white/10 px-4 py-3 font-semibold text-white/80">Aaj abhi check-in nahi hua</p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button type="button" onClick={doCheckIn} disabled={busy || checkedIn || checkedOut} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-gold text-lg font-bold text-charcoal shadow-sm hover:bg-gold-dark hover:text-white disabled:opacity-40">
                  <LogIn className="h-7 w-7" /> {t("checkIn")}
                </button>
                <button type="button" onClick={doCheckOut} disabled={busy || !checkedIn} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-charcoal text-lg font-bold text-white shadow-sm hover:bg-charcoal-light disabled:opacity-40">
                  <LogOut className="h-7 w-7" /> {t("checkOut")}
                </button>
              </div>

              {actionMsg && <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{actionMsg}</p>}
              {actionError && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</p>}

              <div className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-charcoal">My Attendance — {month}</h2>
                  <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} style={{ width: "auto" }} aria-label="Month" />
                </div>
                {myRows.length === 0 ? (
                  <EmptyState message="Is month ki koi attendance nahi hai." />
                ) : (
                  <ul className="mt-4 space-y-2">
                    {myRows.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-line px-3 py-2.5 text-sm">
                        <span className="font-semibold text-charcoal">{formatDate(r.attendance_date)}</span>
                        <span className="flex items-center gap-2">
                          {r.is_late && <Badge tone="amber">Late {r.late_minutes}m</Badge>}
                          <Badge tone={r.status === "present" ? "green" : r.status === "absent" ? "red" : "grey"}>{r.status}</Badge>
                          <span className="text-xs text-ink/60">{formatWorkingMinutes(r.working_minutes)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Manager view */}
          {isManager && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Present Today" value={String(presentToday)} />
                <StatCard label="Late Today" value={String(lateToday)} />
                <StatCard label="Absent Today" value={String(absentToday)} />
              </div>

              {actionMsg && <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{actionMsg}</p>}
              {actionError && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</p>}

              <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
                <h2 className="font-display text-lg font-bold text-charcoal">Mark Attendance (Manager)</h2>
                <p className="mt-1 text-sm text-ink/60">Jo staff check-in nahi kar saka, usko yahan se Present/Absent mark karo.</p>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div>
                    <label htmlFor="mark_emp" className={labelClass}>Employee</label>
                    <select id="mark_emp" value={markEmp} onChange={(e) => setMarkEmp(e.target.value)} className={inputClass}>
                      <option value="">Select employee…</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="mark_status" className={labelClass}>Status</label>
                    <select id="mark_status" value={markStatus} onChange={(e) => setMarkStatus(e.target.value)} className={inputClass}>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="leave">Leave</option>
                      <option value="half_day">Half Day</option>
                    </select>
                  </div>
                  <button type="button" onClick={doMark} disabled={!markEmp} className={goldButtonClass}>
                    <UserX className="h-4 w-4" /> Mark for Today
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-line">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-bold text-charcoal">Today&apos;s Attendance — {formatDate(todayISO())}</h2>
                  <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} style={{ width: "auto" }} aria-label="Month" />
                </div>
                {rows.length === 0 ? (
                  <EmptyState message="Aaj ki koi attendance nahi hai." />
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-160 text-left text-sm">
                      <thead>
                        <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                          <th className="py-2 pe-3">Employee</th>
                          <th className="py-2 pe-3">Status</th>
                          <th className="py-2 pe-3">Check In</th>
                          <th className="py-2 pe-3">Check Out</th>
                          <th className="py-2 pe-3">Late</th>
                          <th className="py-2">Working Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id} className="border-b border-stone-line last:border-0">
                            <td className="py-2 pe-3 font-semibold text-charcoal">{r.employee_name || r.employee_id}</td>
                            <td className="py-2 pe-3"><Badge tone={r.status === "present" ? "green" : r.status === "absent" ? "red" : "grey"}>{r.status}</Badge></td>
                            <td className="py-2 pe-3">{formatTime(r.check_in_at)}</td>
                            <td className="py-2 pe-3">{formatTime(r.check_out_at)}</td>
                            <td className="py-2 pe-3">{r.is_late ? <Badge tone="amber">Late {r.late_minutes}m</Badge> : "—"}</td>
                            <td className="py-2">{formatWorkingMinutes(r.working_minutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {myRows.length > 0 && (
                  <>
                    <h3 className="mt-6 font-display text-base font-bold text-charcoal">Monthly History — {month}</h3>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-140 text-left text-sm">
                        <thead>
                          <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                            <th className="py-2 pe-3">Date</th>
                            <th className="py-2 pe-3">Employee</th>
                            <th className="py-2 pe-3">Status</th>
                            <th className="py-2 pe-3">Check In</th>
                            <th className="py-2">Working Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myRows.slice(0, 50).map((r) => (
                            <tr key={r.id} className="border-b border-stone-line last:border-0">
                              <td className="py-2 pe-3">{formatDate(r.attendance_date)}</td>
                              <td className="py-2 pe-3 font-semibold text-charcoal">{r.employee_name || r.employee_id}</td>
                              <td className="py-2 pe-3"><Badge tone={r.status === "present" ? "green" : r.status === "absent" ? "red" : "grey"}>{r.status}</Badge></td>
                              <td className="py-2 pe-3">{formatTime(r.check_in_at)}</td>
                              <td className="py-2">{formatWorkingMinutes(r.working_minutes)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                <p className="mt-4 text-xs text-ink/50">
                  Late rule (default): duty start 09:00, 15-minute grace — late after 09:15. Settings me change ho sakta hai.
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <button type="button" onClick={doCheckIn} disabled={busy} className={primaryButtonClass}>Manager Check In</button>
                <button type="button" onClick={doCheckOut} disabled={busy} className={secondaryButtonClass}>Manager Check Out</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
