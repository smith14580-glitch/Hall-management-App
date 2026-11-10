"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { fetchCustomers } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import type { Customer } from "@/lib/types";
import {
  ConnectionError,
  EmptyState,
  inputClass,
  LoadingState,
  PageHeader,
} from "@/components/ui";

export default function CustomersPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchCustomers(search));
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

  return (
    <div>
      <PageHeader title={t("customers")} subtitle="Name ya phone se search karo. Customer booking se khud banta hai." />

      <div className="relative mb-5 max-w-md">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name ya phone…"
          className={`${inputClass} ps-9`}
          aria-label={t("search")}
        />
      </div>

      {error ? (
        <ConnectionError error={error} onRetry={load} />
      ) : loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState message="No customers yet. Pehli booking bante hi customer yahan aa jayega." />
      ) : (
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
      )}
    </div>
  );
}
