"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { fetchCustomersPage } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import type { Customer } from "@/lib/types";
import {
  ConnectionError,
  EmptyState,
  inputClass,
  LoadingState,
  PageHeader,
  secondaryButtonClass,
} from "@/components/ui";

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomersPage(search, page * PAGE_SIZE, PAGE_SIZE);
      setRows(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title={t("customers")} subtitle="Search by name or phone. Customer records are created automatically from bookings." />

      <div className="relative mb-5 max-w-md">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Name or phone…"
          className={`${inputClass} ps-9`}
          aria-label={t("search")}
        />
      </div>

      {error ? (
        <ConnectionError error={error} onRetry={() => void load()} />
      ) : loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState message="No customers yet. A customer record is created with the first booking." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
            <table className="w-full min-w-150 text-left text-sm">
              <thead>
                <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                  <th className="px-5 py-3">{t("name")}</th>
                  <th className="px-5 py-3">{t("phone")}</th>
                  <th className="px-5 py-3">{t("address")}</th>
                  <th className="px-5 py-3">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                    <td className="px-5 py-3 font-semibold text-charcoal">{c.full_name}</td>
                    <td className="px-5 py-3" dir="ltr">{c.phone}</td>
                    <td className="px-5 py-3">{c.address || "—"}</td>
                    <td className="px-5 py-3">
                      <Link href={`/customers/${c.id}`} className="font-semibold text-gold-dark hover:underline">
                        {t("view")} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink/60">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Previous
              </button>
              <span className="self-center text-xs font-semibold text-ink/60">
                Page {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={(page + 1) * PAGE_SIZE >= total}
                onClick={() => setPage((p) => p + 1)}
                className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
