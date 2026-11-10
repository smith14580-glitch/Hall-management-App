"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function PaymentsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/bookings/payments/outstanding");
      setItems(data.items || data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Outstanding Balances</h1>
      <Link href="/bookings" className="text-sm underline underline-offset-4">← Back to bookings</Link>
      <div className="border rounded p-3">
        {items.length ? (
          <ul className="space-y-2">
            {items.map((b) => (
              <li key={b.id} className="flex justify-between items-center p-2 border-b">
                <div>
                  <div className="font-medium">{b.booking_code}</div>
                  <div className="text-xs text-muted-foreground">{b.event_type} · {b.event_date}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-red-600">PKR {Number(b.balance_amount).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{b.payment_status}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No outstanding balances</p>
        )}
      </div>
    </div>
  );
}
