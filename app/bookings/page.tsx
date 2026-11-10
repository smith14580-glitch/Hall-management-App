"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-outline",
  confirmed: "badge-primary",
  cancelled: "badge-destructive",
  completed: "badge-secondary",
};

export default function BookingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [search, status]);

  async function load() {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/bookings", {
        query: { search, status },
      });
      setItems(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Bookings</h1>
          <Link href="/bookings/new">
            <Button>New Booking</Button>
          </Link>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input placeholder="Search name/phone/code" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-input bg-background px-2 py-1.5 rounded-md text-sm"
          >
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Booking Code</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Date / Slot</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center">Loading...</TableCell>
            </TableRow>
          ) : items.length ? (
            items.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono">{b.booking_code}</TableCell>
                <TableCell>{b.customer_id}</TableCell>
                <TableCell>{b.event_type}</TableCell>
                <TableCell>{b.event_date} · {b.slot}</TableCell>
                <TableCell>{b.guest_count}</TableCell>
                <TableCell>PKR {Number(b.total_price).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={STATUS_BADGE[b.status] || "badge-outline"}>{b.status}</Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/bookings/${b.id}`} className="text-sm underline underline-offset-4">
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center">No bookings found</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
