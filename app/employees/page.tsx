"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EmployeesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ full_name: "", phone: "", role: "waiter" });
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/employees");
      setItems(data.items || data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function createEmployee() {
    setError("");
    try {
      await apiRequest("/employees", { method: "POST", body: form });
      setOpen(false);
      setForm({ full_name: "", phone: "", role: "waiter" });
      load();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Employees</h1>
        <Button onClick={() => setOpen(true)}>Add Employee</Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="border rounded p-3">
        {loading ? (
          <div>Loading...</div>
        ) : items.length ? (
          <ul className="space-y-2">
            {items.map((e) => (
              <li key={e.id} className="flex justify-between items-center p-2 border-b">
                <div>
                  <div className="font-medium">{e.full_name}</div>
                  <div className="text-xs text-muted-foreground">{e.phone} · {e.role}</div>
                </div>
                <span className="text-xs font-mono">{e.employee_code}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No employees</p>
        )}
      </div>

      <div className={`fixed inset-0 z-50 ${open ? "flex" : "hidden"} items-center justify-center bg-black/50`}>
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
          <h2 className="text-lg font-semibold mb-4">Add Employee</h2>
          <div className="space-y-3">
            <label className="text-sm font-medium block">Full Name</label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <label className="text-sm font-medium block">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <label className="text-sm font-medium block">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="border border-input bg-background px-2 py-1.5 rounded-md text-sm w-full"
            >
              <option value="waiter">Waiter</option>
              <option value="reception">Reception</option>
              <option value="manager">Manager</option>
              <option value="cook">Cook</option>
              <option value="cleaner">Cleaner</option>
              <option value="security">Security</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createEmployee}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
