"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DEFAULT_KEYS = [
  "default_advance_percent",
  "duty_start_time",
  "late_grace_minutes",
  "slot_day_start",
  "slot_day_end",
  "slot_night_start",
  "slot_night_end",
  "app_name",
];

export default function SettingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/settings");
      const rows = data || [];
      const map: Record<string, string> = {};
      rows.forEach((r: any) => { map[r.key] = r.value; });
      setItems(rows);
      setEdits(map);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function save(key: string, value: string) {
    try {
      await apiRequest(`/settings/${key}`, { method: "PATCH", body: { value } });
      setMessage("Saved");
      setTimeout(() => setMessage(""), 2000);
    } catch (e: any) { alert(e.message); }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      {message && <p className="text-sm text-green-600">{message}</p>}
      <div className="border rounded p-3 space-y-3">
        {DEFAULT_KEYS.map((key) => {
          const row = items.find((r: any) => r.key === key) || {};
          const val = edits[key] ?? row.value;
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{key.replace(/_/g, " ")}</div>
                <div className="text-xs text-muted-foreground">{row.description || ""}</div>
              </div>
              <Input
                value={val}
                onChange={(e) => setEdits({ ...edits, [key]: e.target.value })}
                className="w-48"
              />
              <Button size="sm" onClick={() => save(key, edits[key] ?? val)}>Save</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
