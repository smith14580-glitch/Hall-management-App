"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Pencil, Plus, Printer, RefreshCw, Trash2, X } from "lucide-react";
import {
  ApiError,
  activateTable,
  createTable,
  deactivateTable,
  deleteTable,
  fetchBookingTables,
  fetchBookings,
  fetchHalls,
  fetchTables,
  fetchTableUtilization,
  updateTable,
  type TableUtilization,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { formatDate, monthISO, todayISO } from "@/lib/format";
import type { Booking, HallTable, TableAllocation } from "@/lib/types";
import {
  Badge,
  ConnectionError,
  dangerButtonClass,
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

type BoardEntry = { bookingId: string; bookingCode: string; customerName: string };

export default function TablesPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<HallTable[]>([]);
  const [hallCapacity, setHallCapacity] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [formError, setFormError] = useState("");
  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState(10);
  const [busy, setBusy] = useState(false);

  const [bulk, setBulk] = useState({ prefix: "T-", start: 1, end: 10, capacity: 10 });
  const [bulkMsg, setBulkMsg] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState("");
  const [editCapacity, setEditCapacity] = useState(10);

  const [boardDate, setBoardDate] = useState(() => todayISO());
  const [boardSlot, setBoardSlot] = useState("night");
  const [board, setBoard] = useState<Record<string, BoardEntry>>({});
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState<unknown>(null);
  const [utilMonth, setUtilMonth] = useState(() => monthISO(new Date()));
  const [util, setUtil] = useState<TableUtilization | null>(null);
  const [utilLoading, setUtilLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<HallTable | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteForce, setDeleteForce] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tbls, halls] = await Promise.all([
        fetchTables(),
        fetchHalls().catch(() => []),
      ]);
      setRows(tbls);
      setHallCapacity(halls[0]?.capacity_tables ?? null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBoard = useCallback(async () => {
    setBoardLoading(true);
    setBoardError(null);
    try {
      const bookings = await fetchBookings({ event_date: boardDate, slot: boardSlot });
      const active = bookings.filter((b) => b.status !== "cancelled");
      const lists = await Promise.all(
        active.map(async (b: Booking) => ({
          booking: b,
          allocations: await fetchBookingTables(b.id).catch(() => [] as TableAllocation[]),
        })),
      );
      const next: Record<string, BoardEntry> = {};
      for (const item of lists) {
        for (const allocation of item.allocations) {
          next[allocation.table_id] = {
            bookingId: item.booking.id,
            bookingCode: item.booking.booking_code,
            customerName: item.booking.customer_name || "—",
          };
        }
      }
      setBoard(next);
    } catch (err) {
      setBoardError(err);
      setBoard({});
    } finally {
      setBoardLoading(false);
    }
  }, [boardDate, boardSlot]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  useEffect(() => {
    void (async () => {
      await loadBoard();
    })();
  }, [loadBoard]);

  const loadUtilization = useCallback(async () => {
    setUtilLoading(true);
    try {
      setUtil(await fetchTableUtilization(utilMonth));
    } catch {
      setUtil(null);
    } finally {
      setUtilLoading(false);
    }
  }, [utilMonth]);

  useEffect(() => {
    void (async () => {
      await loadUtilization();
    })();
  }, [loadUtilization]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!number.trim()) {
      setFormError("Table number likho (jaise T-13).");
      return;
    }
    if (capacity < 1) {
      setFormError("Capacity kam az kam 1 honi chahiye.");
      return;
    }
    setBusy(true);
    try {
      await createTable({ table_number: number.trim(), capacity });
      setNumber("");
      setCapacity(10);
      await load();
      await loadBoard();
      await loadUtilization();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Table add nahi hui.");
    } finally {
      setBusy(false);
    }
  };

  const onBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBulkMsg("");
    if (
      !Number.isFinite(bulk.start) ||
      !Number.isFinite(bulk.end) ||
      !Number.isFinite(bulk.capacity) ||
      bulk.start < 1 ||
      bulk.end < bulk.start ||
      bulk.capacity < 1
    ) {
      setFormError("Bulk range aur seats sahi likho (start ≤ end).");
      return;
    }
    if (bulk.end - bulk.start + 1 > 100) {
      setFormError("Ek waqt me 100 se zyada tables add na karo.");
      return;
    }
    const existing = new Set(rows.map((row) => row.table_number.toLowerCase()));
    const pending: string[] = [];
    let skipped = 0;
    for (let i = bulk.start; i <= bulk.end; i += 1) {
      const tableNumber = `${bulk.prefix}${String(i).padStart(2, "0")}`;
      if (existing.has(tableNumber.toLowerCase())) {
        skipped += 1;
      } else {
        pending.push(tableNumber);
      }
    }
    if (pending.length === 0) {
      setBulkMsg(`${skipped} table number(s) pehle se exist karte hain — prefix ya range change karo.`);
      return;
    }
    setBusy(true);
    let added = 0;
    try {
      for (const tableNumber of pending) {
        await createTable({ table_number: tableNumber, capacity: bulk.capacity });
        added += 1;
      }
      setBulkMsg(
        `${added} table(s) add ho gaye${skipped ? `, ${skipped} skipped (already exist)` : ""}.`,
      );
      await load();
      await loadBoard();
      await loadUtilization();
    } catch (err) {
      setBulkMsg(
        `${added} table(s) add hue; baqi fail: ${err instanceof ApiError ? err.message : "unknown error"}`,
      );
      await load();
      await loadUtilization();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (row: HallTable) => {
    setFormError("");
    try {
      if (row.is_active) {
        await deactivateTable(row.id);
      } else {
        await activateTable(row.id);
      }
      await load();
      await loadBoard();
      await loadUtilization();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Update nahi ho saka.");
    }
  };

  const startEdit = (row: HallTable) => {
    setEditId(row.id);
    setEditNumber(row.table_number);
    setEditCapacity(row.capacity);
    setFormError("");
  };

  const saveEdit = async (row: HallTable) => {
    if (!editNumber.trim() || editCapacity < 1) {
      setFormError("Table number aur capacity sahi likho.");
      return;
    }
    setBusy(true);
    try {
      await updateTable(row.id, { table_number: editNumber.trim(), capacity: editCapacity });
      setEditId(null);
      await load();
      await loadBoard();
      await loadUtilization();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Table update nahi hui.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteTable(deleteTarget.id, deleteForce);
      setDeleteTarget(null);
      setDeleteForce(false);
      await load();
      await loadBoard();
      await loadUtilization();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Table delete nahi hui.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const activeTables = rows.filter((r) => r.is_active);
  const totalSeats = activeTables.reduce((s, r) => s + r.capacity, 0);
  const allocatedCount = Object.keys(board).length;

  return (
    <div>
      <PageHeader
        title={t("tables")}
        subtitle="Table numbers, capacity, live slot board aur allocation — sab ek jagah."
      />

      {error ? (
        <ConnectionError error={error} onRetry={() => void load()} />
      ) : loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Tables" value={String(rows.length)} sub={`${activeTables.length} active`} />
            <StatCard label="Total Seats" value={String(totalSeats)} sub="Sum of active table capacities" />
            <StatCard
              label="Hall Capacity (tables)"
              value={hallCapacity === null ? "Not set" : String(hallCapacity)}
              sub={hallCapacity === null ? "Settings me capacity set karo — tab tak allocation kaam nahi karegi." : "Set in hall settings"}
            />
          </div>

          {hallCapacity === null && (
            <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Hall capacity abhi set nahi hai (ARCHITECTURE.md Q4). Capacity set kiye baghair table
              allocation enforce nahi ho sakti — Settings / hall details me capacity_tables bharo.
            </p>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <form onSubmit={onAdd} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line">
              <div>
                <label htmlFor="table_number" className={labelClass}>Table Number *</label>
                <input id="table_number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="T-13" className={inputClass} />
              </div>
              <div>
                <label htmlFor="table_capacity" className={labelClass}>Seats *</label>
                <input id="table_capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className={inputClass} />
              </div>
              <button type="submit" data-requires-auth disabled={busy} className={goldButtonClass}>
                <Plus className="h-4 w-4" /> {busy ? "Adding…" : t("addTable")}
              </button>
            </form>

            <form onSubmit={onBulkAdd} className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line">
              <div>
                <label htmlFor="bulk_prefix" className={labelClass}>Prefix</label>
                <input id="bulk_prefix" value={bulk.prefix} onChange={(e) => setBulk({ ...bulk, prefix: e.target.value })} placeholder="T-" className={inputClass} />
              </div>
              <div>
                <label htmlFor="bulk_start" className={labelClass}>From</label>
                <input id="bulk_start" type="number" min={1} value={bulk.start} onChange={(e) => setBulk({ ...bulk, start: Number(e.target.value) })} className={inputClass} />
              </div>
              <div>
                <label htmlFor="bulk_end" className={labelClass}>To</label>
                <input id="bulk_end" type="number" min={1} value={bulk.end} onChange={(e) => setBulk({ ...bulk, end: Number(e.target.value) })} className={inputClass} />
              </div>
              <div>
                <label htmlFor="bulk_capacity" className={labelClass}>Seats</label>
                <input id="bulk_capacity" type="number" min={1} value={bulk.capacity} onChange={(e) => setBulk({ ...bulk, capacity: Number(e.target.value) })} className={inputClass} />
              </div>
              <button type="submit" data-requires-auth disabled={busy} className={secondaryButtonClass}>
                <Plus className="h-4 w-4" /> {busy ? "Adding…" : "Bulk Add"}
              </button>
            </form>
          </div>
          {formError && <p className="mt-3 text-sm text-red-600" role="alert">{formError}</p>}
          {bulkMsg && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800" role="status">{bulkMsg}</p>}

          <div className="print-area mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line sm:p-5">
            <div className="flex flex-wrap items-end gap-3 print:hidden">
              <div>
                <label htmlFor="board_date" className={labelClass}>Event Date</label>
                <input id="board_date" type="date" value={boardDate} onChange={(e) => setBoardDate(e.target.value || todayISO())} className={inputClass} />
              </div>
              <div>
                <label htmlFor="board_slot" className={labelClass}>Slot</label>
                <select id="board_slot" value={boardSlot} onChange={(e) => setBoardSlot(e.target.value)} className={inputClass}>
                  <option value="day">Day</option>
                  <option value="night">Night</option>
                </select>
              </div>
              <button type="button" onClick={() => void loadBoard()} className={secondaryButtonClass}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button type="button" onClick={() => window.print()} className={secondaryButtonClass}>
                <Printer className="h-4 w-4" /> Print plan
              </button>
              <p className="text-xs font-semibold text-ink/60">
                {formatDate(boardDate)} · {boardSlot} slot · {allocatedCount} of {activeTables.length} tables allocated
              </p>
            </div>
            <h2 className="mt-4 hidden font-display text-lg font-bold text-charcoal print:block">
              Table Plan — {formatDate(boardDate)} ({boardSlot} slot)
            </h2>

            {boardError ? (
              <div className="mt-4">
                <ConnectionError error={boardError} onRetry={() => void loadBoard()} />
              </div>
            ) : boardLoading ? (
              <p className="mt-4 text-sm text-ink/50">Loading slot board…</p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {rows.map((row) => {
                  const entry = board[row.id];
                  return (
                    <div
                      key={row.id}
                      className={`rounded-lg border px-2 py-3 text-center text-sm ${
                        entry
                          ? "border-charcoal bg-charcoal text-white"
                          : row.is_active
                            ? "border-gold/40 bg-gold-light text-charcoal"
                            : "border-stone-line bg-stone-100 text-ink/40"
                      }`}
                      title={entry ? `${entry.bookingCode} — ${entry.customerName}` : row.is_active ? "Free" : "Inactive"}
                    >
                      <p className="font-display text-base font-bold">{row.table_number}</p>
                      <p className="text-[11px] opacity-70">{row.capacity} seats</p>
                      {entry ? (
                        <Link href={`/bookings/${entry.bookingId}`} className="mt-1 block truncate text-[10px] font-semibold text-gold-light hover:underline">
                          {entry.bookingCode}
                        </Link>
                      ) : (
                        <p className="mt-1 text-[10px] font-semibold opacity-70">{row.is_active ? "Free" : "Inactive"}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-line sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-charcoal">Table utilization</h2>
                <p className="text-xs text-ink/50">Month me har table kitne events me use hui (active slots ke against).</p>
              </div>
              <div>
                <label htmlFor="util_month" className={labelClass}>Month</label>
                <input id="util_month" type="month" value={utilMonth} onChange={(e) => setUtilMonth(e.target.value || monthISO(new Date()))} className={inputClass} />
              </div>
            </div>
            {utilLoading ? (
              <p className="mt-4 text-sm text-ink/50">Loading utilization…</p>
            ) : !util || util.tables.length === 0 ? (
              <p className="mt-4 text-sm text-ink/50">No tables to report yet.</p>
            ) : (
              <>
                <p className="mt-3 text-xs font-semibold text-ink/60">
                  {util.month} · {util.booked_events} table allocations across {util.total_slots} slots
                </p>
                <div className="mt-4 space-y-2.5">
                  {[...util.tables].sort((a, b) => b.utilization_percent - a.utilization_percent).map((row) => (
                    <div key={row.table_id} className="flex items-center gap-2 sm:gap-3">
                      <span className="w-16 shrink-0 text-xs font-semibold text-ink/70">{row.table_number}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gold-dark to-gold"
                          style={{ width: `${Math.min(100, Math.max(row.utilization_percent > 0 ? 2 : 0, row.utilization_percent))}%` }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right text-[11px] text-ink/60">
                        {row.booked_events} events · {row.utilization_percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-line">
            {rows.length === 0 ? (
              <EmptyState message="No tables yet — upar se pehli table add karo." />
            ) : (
              <table className="w-full min-w-150 text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                    <th className="px-5 py-3">Table</th>
                    <th className="px-5 py-3">Capacity</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                      <td className="px-5 py-3 font-display text-lg font-bold text-charcoal">
                        {editId === row.id ? (
                          <input value={editNumber} onChange={(e) => setEditNumber(e.target.value)} className={`${inputClass} max-w-32`} aria-label="Table number" />
                        ) : (
                          row.table_number
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {editId === row.id ? (
                          <input type="number" min={1} value={editCapacity} onChange={(e) => setEditCapacity(Number(e.target.value))} className={`${inputClass} max-w-24`} aria-label="Table capacity" />
                        ) : (
                          `${row.capacity} guests`
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={row.is_active ? "green" : "grey"}>{row.is_active ? t("active") : t("inactive")}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          {editId === row.id ? (
                            <>
                              <button type="button" data-requires-auth onClick={() => void saveEdit(row)} disabled={busy} className={goldButtonClass}>
                                <Check className="h-4 w-4" /> Save
                              </button>
                              <button type="button" onClick={() => setEditId(null)} className={secondaryButtonClass}>
                                <X className="h-4 w-4" /> Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError("");
                                  setDeleteForce(false);
                                  setDeleteTarget(row);
                                }}
                                className={dangerButtonClass}
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" data-requires-auth onClick={() => startEdit(row)} className={secondaryButtonClass}>
                                <Pencil className="h-4 w-4" /> Edit
                              </button>
                              <button type="button" data-requires-auth onClick={() => void toggleActive(row)} className={secondaryButtonClass}>
                                {row.is_active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError("");
                                  setDeleteForce(false);
                                  setDeleteTarget(row);
                                }}
                                className={dangerButtonClass}
                                aria-label={`Delete ${row.table_number}`}
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {deleteTarget && (
        <Modal title="Delete table" onClose={() => (deleteBusy ? null : setDeleteTarget(null))}>
          <p className="text-sm text-ink/70">
            <span className="font-semibold text-charcoal">{deleteTarget.table_number}</span> permanently delete karni hai?
            Agar is table par booking allocation history hai to neeche force delete tick karo — warning ke saath.
          </p>
          <label className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <input
              type="checkbox"
              checked={deleteForce}
              onChange={(e) => setDeleteForce(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Force delete: is table ki old booking allocations bhi delete ho jayengi.
              Sirf tab use karo jab table permanently hata rahe ho.
            </span>
          </label>
          {deleteError && <p className="mt-3 text-sm text-red-600" role="alert">{deleteError}</p>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteBusy} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="button" data-requires-auth onClick={() => void confirmDelete()} disabled={deleteBusy} className={dangerButtonClass}>
              <Trash2 className="h-4 w-4" /> {deleteBusy ? "Deleting…" : deleteForce ? "Force delete" : "Delete table"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
