"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TablesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ table_number: "", capacity: "" });
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/tables", { query: { hall_id: "marque-one" } });
      setItems(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function createTable() {
    setError("");
    try {
      await apiRequest("/tables", {
        method: "POST",
        query: { hall_id: "marque-one" },
        body: { table_number: form.table_number, capacity: parseInt(form.capacity) || 0 },
      });
      setOpen(false);
      setForm({ table_number: "", capacity: "" });
      load();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Table Management</h1>
        <Button onClick={() => setOpen(true)}>Add Table</Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="border rounded p-3">
        {loading ? (
          <div>Loading...</div>
        ) : items.length ? (
          <ul className="space-y-2">
            {items.map((t) => (
              <li key={t.id} className="flex justify-between items-center p-2 border-b">
                <div>
                  <div className="font-medium">{t.table_number}</div>
                  <div className="text-xs text-muted-foreground">{t.capacity} seats</div>
                </div>
                <span className={`text-xs font-medium ${t.is_active ? "text-green-600" : "text-red-600"}`}>
                  {t.is_active ? "Active" : "Inactive"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No tables</p>
        )}
      </div>

      <div className={`fixed inset-0 z-50 ${open ? "flex" : "hidden"} items-center justify-center bg-black/50`}>
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
          <h2 className="text-lg font-semibold mb-4">Add Table</h2>
          <div className="space-y-3">
            <label className="text-sm font-medium block">Table Number</label>
            <Input value={form.table_number} onChange={(e) => setForm({ ...form, table_number: e.target.value })} />
            <label className="text-sm font-medium block">Capacity</label>
            <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createTable}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
