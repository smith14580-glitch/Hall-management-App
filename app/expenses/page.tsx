"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import {
  ApiError,
  createExpense,
  deleteExpense,
  fetchExpenses,
  updateExpense,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { formatDate, formatPKR, monthISO, todayISO } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { useToast } from "@/components/toast";
import {
  ConnectionError,
  EmptyState,
  goldButtonClass,
  inputClass,
  labelClass,
  LoadingState,
  Modal,
  PageHeader,
  secondaryButtonClass,
  StatCard,
} from "@/components/ui";

const CATEGORIES = [
  { value: "catering", label: "Catering" },
  { value: "decoration", label: "Decoration" },
  { value: "staff", label: "Staff" },
  { value: "utilities", label: "Utilities" },
  { value: "maintenance", label: "Maintenance" },
  { value: "marketing", label: "Marketing" },
  { value: "supplies", label: "Supplies" },
  { value: "other", label: "Other" },
];

function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

function toCSV(rows: Expense[]): string {
  const headers = ["date", "category", "vendor", "description", "amount", "reference", "notes"];
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) =>
      [r.expense_date, r.category, r.vendor || "", r.description, r.amount, r.reference || "", r.notes || ""]
        .map(escape)
        .join(","),
    ),
  ].join("\n");
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

interface FormState {
  category: string;
  vendor: string;
  description: string;
  amount: string;
  expense_date: string;
  reference: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  category: "other",
  vendor: "",
  description: "",
  amount: "",
  expense_date: todayISO(),
  reference: "",
  notes: "",
});

export default function ExpensesPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [month, setMonth] = useState(() => monthISO(new Date()));
  const [category, setCategory] = useState("");
  const [rows, setRows] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExpenses({ month, category: category || undefined });
      setRows(data.items);
      setTotal(data.total);
      setByCategory(data.by_category);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [month, category]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (row: Expense) => {
    setEditing(row);
    setForm({
      category: row.category,
      vendor: row.vendor || "",
      description: row.description,
      amount: String(row.amount),
      expense_date: row.expense_date,
      reference: row.reference || "",
      notes: row.notes || "",
    });
    setFormError("");
    setShowForm(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!form.description.trim()) {
      setFormError("Description likhna zaroori hai.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError("Amount 0 se zyada hona chahiye.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        category: form.category,
        vendor: form.vendor || null,
        description: form.description.trim(),
        amount: Number(form.amount),
        expense_date: form.expense_date,
        reference: form.reference || null,
        notes: form.notes || null,
      };
      if (editing) {
        await updateExpense(editing.id, body);
        toast.success("Expense update ho gaya.");
      } else {
        await createExpense(body);
        toast.success("Expense add ho gaya.");
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Expense save nahi hua.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteExpense(deleting.id);
      toast.success("Expense delete ho gaya.");
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Expense delete nahi hua.");
    }
  };

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  return (
    <div>
      <PageHeader
        title={t("expenses")}
        subtitle="Catering, decoration, staff, utilities — sab kharche yahan record karo. Profit reports me khud adjust honge."
        actions={
          <>
            <button
              type="button"
              onClick={() => downloadCSV(`expenses-${month}.csv`, toCSV(rows))}
              disabled={rows.length === 0}
              className={secondaryButtonClass}
            >
              <Download className="h-4 w-4" /> CSV
            </button>
            <button type="button" data-requires-auth onClick={openAdd} className={goldButtonClass}>
              <Plus className="h-4 w-4" /> Add Expense
            </button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line">
        <div>
          <label htmlFor="exp_month" className={labelClass}>Month</label>
          <input id="exp_month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="exp_cat" className={labelClass}>Category</label>
          <select id="exp_cat" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <p className="pb-2 text-xs text-ink/50">Total {rows.length} entries</p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Expenses" value={formatPKR(total)} tone="dark" />
        <StatCard label="Entries" value={String(rows.length)} />
        <StatCard
          label="Biggest Category"
          value={topCategory ? categoryLabel(topCategory[0]) : "—"}
          sub={topCategory ? formatPKR(topCategory[1]) : "No expenses yet"}
          tone="gold"
        />
      </div>

      {error ? (
        <ConnectionError error={error} onRetry={() => void load()} />
      ) : loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState message="Is month ki koi expense nahi hai. Add Expense se shuru karo." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
          <table className="w-full min-w-180 text-left text-sm">
            <thead>
              <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                  <td className="px-4 py-3">{formatDate(row.expense_date)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-offwhite px-2 py-0.5 text-xs font-semibold text-charcoal">
                      {categoryLabel(row.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.vendor || "—"}</td>
                  <td className="max-w-64 truncate px-4 py-3">{row.description}</td>
                  <td className="px-4 py-3 font-semibold text-red-700">{formatPKR(row.amount)}</td>
                  <td className="px-4 py-3 text-xs text-ink/60">{row.reference || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-lg p-2 text-ink/60 hover:bg-offwhite hover:text-charcoal"
                        aria-label="Edit expense"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(row)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        aria-label="Delete expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? "Edit Expense" : "Add Expense"} onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="exp_category" className={labelClass}>Category</label>
                <select
                  id="exp_category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="exp_date" className={labelClass}>Date</label>
                <input
                  id="exp_date"
                  type="date"
                  required
                  value={form.expense_date}
                  onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="exp_desc" className={labelClass}>Description</label>
              <input
                id="exp_desc"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputClass}
                placeholder="e.g. Catering advance — 300 guests"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="exp_amount" className={labelClass}>Amount (PKR)</label>
                <input
                  id="exp_amount"
                  type="number"
                  min={1}
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="exp_vendor" className={labelClass}>Vendor / Paid To</label>
                <input
                  id="exp_vendor"
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="exp_ref" className={labelClass}>Reference</label>
                <input
                  id="exp_ref"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  className={inputClass}
                  placeholder="Bill / cheque no."
                />
              </div>
              <div>
                <label htmlFor="exp_notes" className={labelClass}>Notes</label>
                <input
                  id="exp_notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
            </div>
            {formError && <p className="text-sm font-semibold text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className={goldButtonClass}>
                {saving ? "Saving…" : editing ? "Update Expense" : "Add Expense"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className={secondaryButtonClass}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete Expense" onClose={() => setDeleting(null)}>
          <p className="text-sm text-ink/70">
            <strong>{deleting.description}</strong> ({formatPKR(deleting.amount)}) delete karna hai? Ye action undo nahi hoga.
          </p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => void confirmDelete()} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              Delete
            </button>
            <button type="button" onClick={() => setDeleting(null)} className={secondaryButtonClass}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
