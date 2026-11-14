"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { fetchBookings, fetchCustomers, fetchQuotations } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Booking, Customer, Quotation } from "@/lib/types";

export function GlobalSearch() {
  const router = useRouter();
  const { isManager, isDemo } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    const timer = window.setTimeout(async () => {
      if (!q) {
        setBookings([]);
        setCustomers([]);
        setQuotations([]);
        return;
      }
      setLoading(true);
      const [b, c, qt] = await Promise.allSettled([
        fetchBookings({ search: q }),
        fetchCustomers(q),
        fetchQuotations({ search: q }),
      ]);
      setBookings(b.status === "fulfilled" ? b.value.slice(0, 5) : []);
      setCustomers(c.status === "fulfilled" ? c.value.slice(0, 5) : []);
      setQuotations(qt.status === "fulfilled" ? qt.value.slice(0, 5) : []);
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  if (!(isManager || isDemo)) return null;

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-line bg-white px-2.5 py-2 text-sm font-semibold text-ink/60 hover:bg-offwhite"
        aria-label="Global search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden rounded border border-stone-line bg-offwhite px-1.5 py-0.5 text-[10px] font-semibold text-ink/50 md:inline">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 px-4 pt-16 sm:pt-24">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-stone-line">
            <div className="flex items-center gap-3 border-b border-stone-line px-4 py-3">
              <Search className="h-5 w-5 text-ink/40" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search booking code, customer, phone, enquiry…"
                className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none"
              />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-ink/40 hover:text-charcoal">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {!query.trim() ? (
                <p className="px-3 py-6 text-center text-sm text-ink/50">Type to search bookings, customers aur quotations.</p>
              ) : loading ? (
                <p className="px-3 py-6 text-center text-sm text-ink/50">Searching…</p>
              ) : (
                <>
                  {bookings.length > 0 && (
                    <section className="mb-2">
                      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-ink/40">Bookings</p>
                      {bookings.map((b) => (
                        <button key={b.id} type="button" onClick={() => go(`/bookings/${b.id}`)} className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-offwhite">
                          <span className="min-w-0">
                            <span className="font-semibold text-charcoal">{b.booking_code}</span>
                            <span className="ms-2 text-ink/70">{b.customer_name}</span>
                          </span>
                          <span className="shrink-0 text-xs text-ink/50">{b.event_date}</span>
                        </button>
                      ))}
                    </section>
                  )}
                  {customers.length > 0 && (
                    <section className="mb-2">
                      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-ink/40">Customers</p>
                      {customers.map((c) => (
                        <button key={c.id} type="button" onClick={() => go(`/customers/${c.id}`)} className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-offwhite">
                          <span className="font-semibold text-charcoal">{c.full_name}</span>
                          <span className="shrink-0 text-xs text-ink/50" dir="ltr">{c.phone}</span>
                        </button>
                      ))}
                    </section>
                  )}
                  {quotations.length > 0 && (
                    <section>
                      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-ink/40">Quotations</p>
                      {quotations.map((q) => (
                        <button key={q.id} type="button" onClick={() => go("/quotations")} className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-offwhite">
                          <span className="min-w-0">
                            <span className="font-semibold text-charcoal">{q.enquiry_no}</span>
                            <span className="ms-2 text-ink/70">{q.client_name}</span>
                          </span>
                          <span className="shrink-0 text-xs text-ink/50">{q.valid_until || ""}</span>
                        </button>
                      ))}
                    </section>
                  )}
                  {bookings.length === 0 && customers.length === 0 && quotations.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm text-ink/50">Kuch nahi mila.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
