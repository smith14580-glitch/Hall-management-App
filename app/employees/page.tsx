"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Plus, Printer, QrCode, Search, Wallet } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  ApiError,
  createEmployee,
  deactivateEmployee,
  fetchEmployeeSalary,
  fetchEmployees,
  saveEmployeeSalary,
  updateSalary,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { formatDate, formatPKR, monthISO, todayISO } from "@/lib/format";
import type { Employee, SalaryRecord } from "@/lib/types";
import {
  Badge,
  ConnectionError,
  EmptyState,
  goldButtonClass,
  inputClass,
  labelClass,
  LoadingState,
  Modal,
  PageHeader,
  secondaryButtonClass,
} from "@/components/ui";

const JOB_ROLES = ["manager", "reception", "waiter", "cook", "cleaner", "security", "other"];

function salaryTone(status: SalaryRecord["status"]) {
  if (status === "paid") return "green" as const;
  if (status === "partial") return "amber" as const;
  return "red" as const;
}

export default function EmployeesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobRole, setJobRole] = useState("waiter");
  const [password, setPassword] = useState("");

  const [qrEmp, setQrEmp] = useState<Employee | null>(null);
  const [salaryEmp, setSalaryEmp] = useState<Employee | null>(null);
  const [salaryRows, setSalaryRows] = useState<SalaryRecord[]>([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salMonth, setSalMonth] = useState(() => monthISO(new Date()));
  const [salBase, setSalBase] = useState("");
  const [salPaid, setSalPaid] = useState("0");
  const [salDate, setSalDate] = useState(() => todayISO());
  const [salNotes, setSalNotes] = useState("");
  const [salError, setSalError] = useState("");
  const [salMsg, setSalMsg] = useState("");
  const [salBusy, setSalBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchEmployees(search));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (fullName.trim().length < 2) {
      setFormError("Poora naam likho.");
      return;
    }
    if (phone.trim().length < 10) {
      setFormError("Phone number kam az kam 10 digits ka ho.");
      return;
    }
    setBusy(true);
    try {
      await createEmployee({
        full_name: fullName.trim(),
        phone: phone.trim(),
        role: jobRole,
        password: password.trim() || undefined,
      });
      setFullName("");
      setPhone("");
      setJobRole("waiter");
      setPassword("");
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Employee add nahi hua.");
    } finally {
      setBusy(false);
    }
  };

  const onDeactivate = async (row: Employee) => {
    if (!window.confirm(`${row.full_name} ko deactivate karna hai? Unka login bhi band ho jayega.`)) return;
    try {
      await deactivateEmployee(row.id);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Deactivate nahi ho saka.");
    }
  };

  const openSalary = async (emp: Employee) => {
    setSalaryEmp(emp);
    setSalError("");
    setSalMsg("");
    setSalMonth(monthISO(new Date()));
    setSalBase(emp.monthly_salary != null ? String(emp.monthly_salary) : "");
    setSalPaid("0");
    setSalDate(todayISO());
    setSalNotes("");
    setSalaryLoading(true);
    try {
      setSalaryRows(await fetchEmployeeSalary(emp.id));
    } catch {
      setSalaryRows([]);
    } finally {
      setSalaryLoading(false);
    }
  };

  const reloadSalary = async (emp: Employee) => {
    try {
      setSalaryRows(await fetchEmployeeSalary(emp.id));
    } catch {
      setSalaryRows([]);
    }
  };

  const onSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryEmp) return;
    setSalError("");
    setSalMsg("");
    const base = Number(salBase);
    const paid = Number(salPaid || 0);
    if (!salMonth) {
      setSalError("Month chuno.");
      return;
    }
    if (!Number.isFinite(base) || base < 0) {
      setSalError("Base amount sahi likho.");
      return;
    }
    if (!Number.isFinite(paid) || paid < 0) {
      setSalError("Paid amount sahi likho.");
      return;
    }
    setSalBusy(true);
    try {
      await saveEmployeeSalary(salaryEmp.id, {
        month: salMonth,
        base_amount: base,
        paid_amount: paid,
        payment_date: salDate || undefined,
        notes: salNotes || undefined,
      });
      setSalMsg("Salary record save ho gaya.");
      await reloadSalary(salaryEmp);
    } catch (err) {
      setSalError(err instanceof ApiError ? err.message : "Salary save nahi hui.");
    } finally {
      setSalBusy(false);
    }
  };

  const onMarkPaid = async (record: SalaryRecord) => {
    setSalError("");
    setSalMsg("");
    try {
      await updateSalary(record.id, {
        paid_amount: record.base_amount,
        payment_date: todayISO(),
        status: "paid",
      });
      setSalMsg(`${record.month} — salary paid mark ho gayi.`);
      if (salaryEmp) await reloadSalary(salaryEmp);
    } catch (err) {
      setSalError(err instanceof ApiError ? err.message : "Mark paid nahi ho saka.");
    }
  };

  return (
    <div>
      <PageHeader
        title={t("employees")}
        subtitle="Employees, unique attendance ID + QR badge, salary records aur account status."
        actions={
          <button type="button" data-requires-auth onClick={() => setShowForm(true)} className={goldButtonClass}>
            <Plus className="h-4 w-4" /> {t("addEmployee")}
          </button>
        }
      />

      <div className="relative mb-5 max-w-md">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name ya employee code…"
          className={`${inputClass} ps-9`}
          aria-label={t("search")}
        />
      </div>

      {formError && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{formError}</p>
      )}

      {error ? (
        <ConnectionError error={error} onRetry={load} />
      ) : loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState message="No employees yet — Add Employee se pehla employee banao." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
          <table className="w-full min-w-200 text-left text-sm">
            <thead>
              <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3">Unique ID</th>
                <th className="px-4 py-3">{t("name")}</th>
                <th className="px-4 py-3">{t("phone")}</th>
                <th className="px-4 py-3">{t("role")}</th>
                <th className="px-4 py-3">Hire Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-gold-dark">{row.employee_code}</td>
                  <td className="px-4 py-3 font-semibold text-charcoal">{row.full_name}</td>
                  <td className="px-4 py-3" dir="ltr">{row.phone}</td>
                  <td className="px-4 py-3 capitalize">{row.role}</td>
                  <td className="px-4 py-3">{row.hire_date ? formatDate(row.hire_date) : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={row.is_active ? "green" : "grey"}>{row.is_active ? t("active") : t("inactive")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setQrEmp(row)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-stone-line bg-white px-2.5 py-1.5 text-xs font-semibold text-charcoal hover:bg-offwhite">
                        <QrCode className="h-3.5 w-3.5" /> QR
                      </button>
                      <button type="button" onClick={() => void openSalary(row)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-stone-line bg-white px-2.5 py-1.5 text-xs font-semibold text-charcoal hover:bg-offwhite">
                        <Wallet className="h-3.5 w-3.5" /> {t("salary")}
                      </button>
                      {row.is_active && (
                        <button type="button" onClick={() => onDeactivate(row)} className="inline-flex min-h-9 items-center rounded-lg border border-stone-line bg-white px-2.5 py-1.5 text-xs font-semibold text-charcoal hover:bg-offwhite">
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title="Add Employee" onClose={() => setShowForm(false)}>
          <form onSubmit={onAdd} className="space-y-4">
            <div>
              <label htmlFor="emp_name" className={labelClass}>Full Name *</label>
              <input id="emp_name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="emp_phone" className={labelClass}>Phone *</label>
              <input id="emp_phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" className={inputClass} />
            </div>
            <div>
              <label htmlFor="emp_role" className={labelClass}>Job Role *</label>
              <select id="emp_role" value={jobRole} onChange={(e) => setJobRole(e.target.value)} className={inputClass}>
                {JOB_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="emp_password" className={labelClass}>Login Password (optional)</label>
              <input id="emp_password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars — login ke liye" className={inputClass} />
              <p className="mt-1 text-xs text-ink/50">Password do toh employee is phone + password se login kar sakta hai (role staff/waiter). Khali chhodo toh sirf employee record banega.</p>
            </div>
            <p className="text-xs text-ink/60">
              Employee code (EMP-0001…) backend khud banata hai. Ye hi unique attendance ID hai
              jiska QR badge scan hota hai.
            </p>
            {formError && <p className="text-sm text-red-600" role="alert">{formError}</p>}
            <div className="flex gap-2">
              <button type="submit" data-requires-auth disabled={busy} className={goldButtonClass}>{busy ? "Adding…" : t("addEmployee")}</button>
              <button type="button" onClick={() => setShowForm(false)} className={secondaryButtonClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {qrEmp && (
        <Modal title={`QR — ${qrEmp.full_name}`} onClose={() => setQrEmp(null)}>
          <div className="print-area rounded-xl border border-stone-line bg-white p-6 text-center">
            <p className="font-display text-2xl font-bold text-charcoal">
              MARQUE <span className="text-gold">ONE</span>
            </p>
            <p className="mt-1 text-xs uppercase tracking-widest text-ink/50">{t("attendanceBadge")}</p>
            <div className="mt-4 flex justify-center">
              <QRCodeSVG value={qrEmp.employee_code} size={190} level="M" />
            </div>
            <p className="mt-4 font-display text-lg font-bold text-charcoal">{qrEmp.full_name}</p>
            <p className="font-mono text-sm font-semibold text-gold-dark">{qrEmp.employee_code}</p>
            <p className="mt-1 text-xs capitalize text-ink/60">{qrEmp.role} · {qrEmp.phone}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => window.print()} className={secondaryButtonClass}>
              <Printer className="h-4 w-4" /> Print
            </button>
            <button type="button" onClick={() => setQrEmp(null)} className={secondaryButtonClass}>
              {t("close")}
            </button>
          </div>
        </Modal>
      )}

      {salaryEmp && (
        <Modal title={`${t("salary")} — ${salaryEmp.full_name}`} onClose={() => setSalaryEmp(null)}>
          <form onSubmit={onSaveSalary} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="sal_month" className={labelClass}>Month *</label>
                <input id="sal_month" type="month" value={salMonth} onChange={(e) => setSalMonth(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="sal_base" className={labelClass}>Base Salary (PKR) *</label>
                <input id="sal_base" type="number" min={0} value={salBase} onChange={(e) => setSalBase(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="sal_paid" className={labelClass}>Paid Amount (PKR)</label>
                <input id="sal_paid" type="number" min={0} value={salPaid} onChange={(e) => setSalPaid(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="sal_date" className={labelClass}>Payment Date</label>
                <input id="sal_date" type="date" value={salDate} onChange={(e) => setSalDate(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="sal_notes" className={labelClass}>Notes</label>
              <input id="sal_notes" value={salNotes} onChange={(e) => setSalNotes(e.target.value)} className={inputClass} placeholder="Optional" />
            </div>
            {salError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{salError}</p>}
            {salMsg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{salMsg}</p>}
            <div className="flex gap-2">
              <button type="submit" data-requires-auth disabled={salBusy} className={goldButtonClass}>
                {salBusy ? "Saving…" : t("save")}
              </button>
              <button type="button" onClick={() => setSalaryEmp(null)} className={secondaryButtonClass}>{t("close")}</button>
            </div>
          </form>

          <h3 className="mt-6 font-display text-base font-bold text-charcoal">{t("salaryHistory")}</h3>
          {salaryLoading ? (
            <div className="mt-3"><LoadingState /></div>
          ) : salaryRows.length === 0 ? (
            <div className="mt-3"><EmptyState message={t("noData")} /></div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-120 text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                    <th className="py-2 pe-3">Month</th>
                    <th className="py-2 pe-3">Base</th>
                    <th className="py-2 pe-3">Paid</th>
                    <th className="py-2 pe-3">Balance</th>
                    <th className="py-2 pe-3">Status</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryRows.map((r) => (
                    <tr key={r.id} className="border-b border-stone-line last:border-0">
                      <td className="py-2 pe-3 font-semibold">{r.month}</td>
                      <td className="py-2 pe-3">{formatPKR(r.base_amount)}</td>
                      <td className="py-2 pe-3">{formatPKR(r.paid_amount)}</td>
                      <td className="py-2 pe-3 font-semibold text-red-700">{formatPKR(r.balance)}</td>
                      <td className="py-2 pe-3">
                        <Badge tone={salaryTone(r.status)}>{r.status}</Badge>
                      </td>
                      <td className="py-2">
                        {r.status !== "paid" && (
                          <button
                            type="button"
                            data-requires-auth
                            onClick={() => void onMarkPaid(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t("markPaid")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
