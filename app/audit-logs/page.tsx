"use client";

import React, { useCallback, useEffect, useState } from "react";
import { fetchAuditLogs } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  ConnectionError,
  EmptyState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

type Log = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  created_at: string | null;
};

export default function AuditLogsPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuditLogs();
      setRows(Array.isArray(data) ? (data as Log[]) : []);
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

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Recent system actions and changes." />

      {error ? (
        <ConnectionError error={error} onRetry={() => void load()} />
      ) : loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState message="No audit log entries yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
          <table className="w-full min-w-160 text-left text-sm">
            <thead>
              <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">Entity ID</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                  <td className="px-5 py-3 font-semibold text-charcoal">{row.action}</td>
                  <td className="px-5 py-3 capitalize">{row.entity_type.replace("_", " ")}</td>
                  <td className="px-5 py-3 text-xs text-ink/60">{row.entity_id || "—"}</td>
                  <td className="px-5 py-3 text-xs text-ink/60">{row.user_id || "—"}</td>
                  <td className="px-5 py-3 text-xs text-ink/60">{row.created_at ? formatDate(row.created_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
