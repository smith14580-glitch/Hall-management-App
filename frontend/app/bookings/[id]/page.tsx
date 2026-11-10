import { cache } from "react";

export const generateStaticParams = () => [{ id: "dummy" }];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  confirmed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-gray-200 text-gray-600",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const fetchJson = cache(async (path: string) => {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
});

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  const booking: any = isBuild ? null : await fetchJson(`/api/v1/bookings/${id}`);
  const payments: any = isBuild ? null : await fetchJson(`/api/v1/bookings/${id}/payments`);
  const tables: any = isBuild ? null : await fetchJson(`/api/v1/bookings/${id}/tables`);

  const items = booking?.data || booking;
  const payList = payments?.data || payments || [];
  const tableList = tables?.data || tables || [];

  if (!items) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Booking</h1>
        <p className="text-muted-foreground">Booking not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{items.booking_code}</h1>
          <p className="text-muted-foreground">
            {items.event_type} · {items.event_date} · {items.slot}
          </p>
        </div>
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${STATUS_BADGE[items.status] || "bg-gray-100 text-gray-800"}`}>
          {items.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Total</label>
          <p className="font-mono">PKR {Number(items.total_price || 0).toLocaleString()}</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Advance</label>
          <p className="font-mono">PKR {Number(items.advance_amount || 0).toLocaleString()}</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Balance</label>
          <p className="font-mono text-red-600">PKR {Number(items.balance_amount || 0).toLocaleString()}</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Status</label>
          <p>{items.payment_status}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Payments</h2>
        <div className="border rounded p-3">
          {payList.length ? (
            <ul className="space-y-2 text-sm">
              {payList.map((p: any) => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.receipt_number} · {p.amount} · {p.method}</span>
                  <span className="text-xs text-muted-foreground">{p.payment_date}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No payments yet</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Tables</h2>
        <div className="border rounded p-3">
          {tableList.length ? (
            <ul className="space-y-1 text-sm">
              {tableList.map((t: any) => (
                <li key={t.id} className="flex justify-between">
                  <span>{t.table_number} · {t.capacity} seats</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No tables allocated</p>
          )}
        </div>
      </div>

      <a href="/bookings" className="text-sm underline underline-offset-4">
        Back to list
      </a>
    </div>
  );
}
