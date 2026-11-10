"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function AttendancePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/attendance/me");
      setItems(data.items || data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function checkIn() {
    try {
      await apiRequest("/attendance/check-in", { method: "POST", body: {} });
      load();
    } catch (e: any) { alert(e.message); }
  }

  async function checkOut() {
    try {
      await apiRequest("/attendance/check-out", { method: "POST", body: {} });
      load();
    } catch (e: any) { alert(e.message); }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">My Attendance</h1>
      <div className="flex gap-3">
        <Button onClick={checkIn} className="bg-green-600 hover:bg-green-700">Check In</Button>
        <Button onClick={checkOut} variant="outline">Check Out</Button>
      </div>
      <div className="border rounded p-3">
        {loading ? <div>Loading...</div> : (
          <ul className="space-y-2">
          {items.length ? (
            items.map((a) => (
              <li key={a.id} className="flex justify-between items-center p-2 border-b">
                <div>
                  <div className="font-medium">{a.attendance_date}</div>
                  <div className="text-xs text-muted-foreground">{a.status}</div>
                </div>
                <div className="text-right text-sm">
                  {a.check_in_at ? <div>In: {new Date(a.check_in_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div> : null}
                  {a.check_out_at ? <div>Out: {new Date(a.check_out_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div> : null}
                  {a.is_late && <span className="text-xs text-red-600">Late</span>}
                </div>
              </li>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No attendance records</p>
          )}
        </ul>
        )}
      </div>
    </div>
  );
}
