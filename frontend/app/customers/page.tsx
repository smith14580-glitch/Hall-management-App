"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CustomersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    load();
  }, [search]);

  async function load() {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/customers", { query: { search } });
      setItems(data.items || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function createCustomer() {
    setError("");
    try {
      await apiRequest("/customers", { method: "POST", body: form });
      setOpen(false);
      setForm({ full_name: "", phone: "" });
      load();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Customers</h1>
        <Button onClick={() => setOpen(true)}>Add Customer</Button>
      </div>
      <Input placeholder="Search name/phone" value={search} onChange={(e) => setSearch(e.target.value)} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="border rounded p-3">
        {loading ? (
          <div>Loading...</div>
        ) : items.length ? (
          <ul className="space-y-2">
            {items.map((c) => (
              <li key={c.id} className="flex justify-between items-center p-2 border-b">
                <div>
                  <div className="font-medium">{c.full_name}</div>
                  <div className="text-xs text-muted-foreground">{c.phone}</div>
                </div>
                <span className="text-xs font-mono">{c.id.slice(0, 8)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No customers</p>
        )}
      </div>

      <div className={`fixed inset-0 z-50 ${open ? "flex" : "hidden"} items-center justify-center bg-black/50`}>
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
          <h2 className="text-lg font-semibold mb-4">Add Customer</h2>
          <div className="space-y-3">
            <label className="text-sm font-medium">Full Name</label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <label className="text-sm font-medium">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createCustomer}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
