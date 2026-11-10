"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewBookingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [eventType, setEventType] = useState("Wedding");
  const [eventDate, setEventDate] = useState("");
  const [slot, setSlot] = useState("night");
  const [guestCount, setGuestCount] = useState("");
  const [tablesRequired, setTablesRequired] = useState("");
  const [advance, setAdvance] = useState("");

  const eventTypes = ["Wedding", "Mehndi", "Barat", "Walima", "Engagement", "Nikkah", "Other"];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest<any>("/bookings", {
        method: "POST",
        body: {
          customer_phone: customerPhone,
          event_type: eventType,
          event_date: eventDate,
          slot,
          guest_count: parseInt(guestCount) || 0,
          tables_required: parseInt(tablesRequired) || 0,
          advance_amount: parseFloat(advance) || 0,
        },
      });
      setSuccess("Booking created successfully");
    } catch (e: any) {
      setError(e.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  }

  function field(label: string, element: any) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium block">{label}</label>
        {element}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">New Booking</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("Customer Phone", (
            <Input placeholder="03001234567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          ))}
          {field("Event Type", (
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="border border-input bg-background px-2 py-1.5 rounded-md text-sm w-full"
            >
              {eventTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field("Event Date", (
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          ))}
          {field("Slot", (
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="border border-input bg-background px-2 py-1.5 rounded-md text-sm w-full"
            >
              <option value="day">Day</option>
              <option value="night">Night</option>
            </select>
          ))}
          {field("Guest Count", (
            <Input type="number" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("Tables Required", (
            <Input type="number" value={tablesRequired} onChange={(e) => setTablesRequired(e.target.value)} />
          ))}
          {field("Advance Amount (PKR)", (
            <Input type="number" value={advance} onChange={(e) => setAdvance(e.target.value)} />
          ))}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Booking"}
        </Button>
      </form>
    </div>
  );
}
