"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { ApiError, createEmployee, deactivateEmployee, fetchEmployees } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import type { Employee } from "@/lib/types";
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

  return (
    <div>
      <PageHeader
        title={t("employees")}
        subtitle="Employees, unki job roles aur account status. Login account manager banata hai."
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
          <table className="w-full min-w-160 text-left text-sm">
            <thead>
              <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">{t("name")}</th>
                <th className="px-5 py-3">{t("phone")}</th>
                <th className="px-5 py-3">{t("role")}</th>
                <th className="px-5 py-3">Hire Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                  <td className="px-5 py-3 font-semibold text-charcoal">{row.employee_code}</td>
                  <td className="px-5 py-3 font-semibold text-charcoal">{row.full_name}</td>
                  <td className="px-5 py-3" dir="ltr">{row.phone}</td>
                  <td className="px-5 py-3 capitalize">{row.role}</td>
                  <td className="px-5 py-3">{row.hire_date ? formatDate(row.hire_date) : "—"}</td>
                  <td className="px-5 py-3">
                    <Badge tone={row.is_active ? "green" : "grey"}>{row.is_active ? t("active") : t("inactive")}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    {row.is_active && (
                      <button type="button" onClick={() => onDeactivate(row)} className={secondaryButtonClass}>
                        Deactivate
                      </button>
                    )}
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
              <p className="mt-1 text-xs text-ink/50">Agar password do toh employee is phone + password se login kar sakta hai (role staff/waiter). Khali chhodo toh sirf employee record banega.</p>
            </div>
            <p className="text-xs text-ink/60">
              Employee code (EMP-0001…) backend khud banata hai. Login account alag se
              banta hai — phone number login identifier hai.
            </p>
            {formError && <p className="text-sm text-red-600" role="alert">{formError}</p>}
            <div className="flex gap-2">
              <button type="submit" data-requires-auth disabled={busy} className={goldButtonClass}>{busy ? "Adding…" : t("addEmployee")}</button>
              <button type="button" onClick={() => setShowForm(false)} className={secondaryButtonClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
