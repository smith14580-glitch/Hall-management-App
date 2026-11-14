"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Plus, Printer, Search, Send, Settings as SettingsIcon } from "lucide-react";
import {
  ApiError,
  createQuotation,
  fetchHalls,
  fetchQuotationTemplate,
  fetchQuotations,
  markQuotationSent,
  normalizePhone,
  updateQuotationTemplate,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/toast";
import { formatDate, todayISO } from "@/lib/format";
import type { Hall, Quotation, QuotationTemplate } from "@/lib/types";
import {
  Badge,
  ConnectionError,
  EmptyState,
  goldButtonClass,
  inputClass,
  labelClass,
  LoadingState,
  Modal,
  PageHeader,
  secondaryButtonClass,
} from "@/components/ui";

const SOURCES = ["walk-in", "phone", "whatsapp"];
const EVENT_TYPES = ["Barat", "Walima", "Mehndi", "Nikkah", "Engagement", "Reception", "Other"];
const PLACEHOLDERS = [
  "{{client_name}}", "{{enquiry_no}}", "{{enquiry_date}}", "{{source}}", "{{event_type}}",
  "{{event_date}}", "{{slot}}", "{{guest_count}}", "{{hall_name}}", "{{package_price}}",
  "{{advance_percent}}", "{{valid_until}}", "{{manager_name}}", "{{manager_phone}}",
  "{{office_timings}}", "{{location_link}}", "{{facilities}}", "{{chargeable_items}}", "{{policies}}",
];

function renderTemplate(tpl: QuotationTemplate, values: Record<string, string>): string {
  const body = tpl.template_body || "";
  const facilities = tpl.facilities ?? "";
  const chargeable = tpl.chargeable_items ?? "";
  const policies = tpl.policies ?? "";
  const map: Record<string, string> = {
    client_name: values.client_name || "",
    enquiry_no: values.enquiry_no || "",
    enquiry_date: values.enquiry_date || "",
    source: values.source || "",
    event_type: values.event_type || "",
    event_date: values.event_date || "",
    slot: values.slot || "",
    guest_count: values.guest_count || "",
    hall_name: values.hall_name || "",
    package_price: values.package_price || "",
    advance_percent: values.advance_percent || "",
    valid_until: values.valid_until || "",
    manager_name: tpl.manager_name || "",
    manager_phone: tpl.manager_phone || "",
    office_timings: tpl.office_timings || "",
    location_link: tpl.location_link || "",
    facilities,
    chargeable_items: chargeable,
    policies,
  };
  let out = body;
  for (const [k, v] of Object.entries(map)) {
    out = out.split("{{" + k + "}}").join(v);
  }
  return out;
}

function fmtDateInput(d: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function isExpired(validUntil?: string | null) {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date(todayISO());
}

export default function QuotationsPage() {
  const { isManager, isDemo } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<"new" | "template">("new");
  const [template, setTemplate] = useState<QuotationTemplate | null>(null);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // form
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [source, setSource] = useState("phone");
  const [eventType, setEventType] = useState("Barat");
  const [eventDate, setEventDate] = useState("");
  const [slot, setSlot] = useState<"day" | "night">("night");
  const [guestCount, setGuestCount] = useState("");
  const [hallId, setHallId] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  // list
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewQ, setViewQ] = useState<Quotation | null>(null);

  // template form
  const [tplBody, setTplBody] = useState("");
  const [tplFacilities, setTplFacilities] = useState("");
  const [tplChargeable, setTplChargeable] = useState("");
  const [tplPolicies, setTplPolicies] = useState("");
  const [tplOffice, setTplOffice] = useState("");
  const [tplManagerName, setTplManagerName] = useState("");
  const [tplManagerPhone, setTplManagerPhone] = useState("");
  const [tplLocation, setTplLocation] = useState("");
  const [tplValidity, setTplValidity] = useState(7);
  const [tplMsg, setTplMsg] = useState("");
  const [tplErr, setTplErr] = useState("");
  const [tplBusy, setTplBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tplRes, hallList, qs] = await Promise.all([
        fetchQuotationTemplate(),
        fetchHalls().catch(() => [] as Hall[]),
        fetchQuotations(),
      ]);
      setTemplate(tplRes.template);
      setHalls(hallList.length ? hallList : []);
      setQuotations(qs);
      // init template form
      const t = tplRes.template;
      setTplBody(t.template_body);
      setTplFacilities(t.facilities || "");
      setTplChargeable(t.chargeable_items || "");
      setTplPolicies(t.policies || "");
      setTplOffice(t.office_timings || "");
      setTplManagerName(t.manager_name || "");
      setTplManagerPhone(t.manager_phone || "");
      setTplLocation(t.location_link || "");
      setTplValidity(t.validity_days || 7);
      if (!hallId && hallList.length) setHallId(hallList[0].id);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [hallId]);

  useEffect(() => {
    if (!(isManager || isDemo)) return;
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [isManager, isDemo, load]);

  const reloadList = useCallback(async () => {
    setListLoading(true);
    try {
      setQuotations(await fetchQuotations({ search: search || undefined, status: statusFilter || undefined }));
    } catch {
      setQuotations([]);
    } finally {
      setListLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    if (!(isManager || isDemo)) return;
    const id = window.setTimeout(() => void reloadList(), 300);
    return () => window.clearTimeout(id);
  }, [isManager, isDemo, reloadList]);

  const selectedHall = halls.find((h) => h.id === hallId) || halls[0];
  const packagePrice = slot === "day" ? selectedHall?.day_price : selectedHall?.night_price;

  const preview = useMemo(() => {
    if (!template) return "";
    const today = todayISO();
    const base = new Date(`${today}T00:00:00`);
    base.setDate(base.getDate() + (template.validity_days || 7));
    const validUntil = base.toISOString().slice(0, 10);
    return renderTemplate(template, {
      client_name: clientName || "Client Name",
      enquiry_no: "QT-2026-0001",
      enquiry_date: fmtDateInput(today),
      source: source || "",
      event_type: eventType || "",
      event_date: fmtDateInput(eventDate),
      slot: slot,
      guest_count: guestCount || "",
      hall_name: selectedHall?.name || "MARQUE ONE",
      package_price: packagePrice ? `PKR ${Number(packagePrice).toLocaleString("en-US")}` : "",
      advance_percent: "50",
      valid_until: fmtDateInput(validUntil),
    });
  }, [template, clientName, source, eventType, eventDate, slot, guestCount, selectedHall, packagePrice]);

  const onSend = async () => {
    setFormError("");
    if (clientName.trim().length < 2) {
      setFormError("Client ka naam likho.");
      return;
    }
    const normalized = normalizePhone(clientPhone);
    if (normalized.length < 12) {
      setFormError("Phone number sahi format me ho (03xx-xxxxxxx).");
      return;
    }
    setBusy(true);
    try {
      const q = await createQuotation({
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        source,
        event_type: eventType,
        event_date: eventDate || undefined,
        slot,
        guest_count: guestCount ? Number(guestCount) : undefined,
        hall_id: hallId || undefined,
      });
      if (q.whatsapp_url) {
        window.open(q.whatsapp_url, "_blank", "noopener,noreferrer");
      }
      await markQuotationSent(q.id).catch(() => undefined);
      toast.success(`${q.enquiry_no} — quotation ready, WhatsApp khul raha hai.`);
      setClientName("");
      setClientPhone("");
      setGuestCount("");
      setEventDate("");
      await reloadList();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Quotation nahi bana.");
    } finally {
      setBusy(false);
    }
  };

  const onSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTplErr("");
    setTplMsg("");
    setTplBusy(true);
    try {
      const updated = await updateQuotationTemplate({
        template_body: tplBody,
        facilities: tplFacilities,
        chargeable_items: tplChargeable,
        policies: tplPolicies,
        office_timings: tplOffice,
        manager_name: tplManagerName,
        manager_phone: tplManagerPhone,
        location_link: tplLocation,
        validity_days: tplValidity,
      });
      setTemplate(updated);
      setTplMsg("Template save ho gaya.");
      toast.success("Message template save ho gaya.");
    } catch (err) {
      setTplErr(err instanceof ApiError ? err.message : "Template save nahi hua.");
    } finally {
      setTplBusy(false);
    }
  };

  const resend = (q: Quotation) => {
    if (!q.message_body) return;
    const phone = normalizePhone(q.client_phone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(q.message_body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!(isManager || isDemo)) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="WhatsApp Quotations"
        subtitle="Client ka number daalo, quotation preview dekho, aur ek click par WhatsApp khul jaye."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("new")}
              className={tab === "new" ? goldButtonClass : secondaryButtonClass}
            >
              <Plus className="h-4 w-4" /> New Quotation
            </button>
            <button
              type="button"
              onClick={() => setTab("template")}
              className={tab === "template" ? goldButtonClass : secondaryButtonClass}
            >
              <SettingsIcon className="h-4 w-4" /> Message Template
            </button>
          </div>
        }
      />

      {error ? <ConnectionError error={error} onRetry={() => void load()} /> : null}

      {loading ? (
        <LoadingState />
      ) : tab === "template" ? (
        <form onSubmit={onSaveTemplate} className="space-y-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
            <h2 className="font-display text-lg font-bold text-charcoal">Template body</h2>
            <p className="mt-1 text-xs text-ink/60">
              Placeholders: {PLACEHOLDERS.join(", ")}
            </p>
            <textarea
              value={tplBody}
              onChange={(e) => setTplBody(e.target.value)}
              rows={18}
              className={`${inputClass} mt-3 font-mono text-xs`}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
              <h3 className="font-display text-base font-bold text-charcoal">Facilities</h3>
              <textarea value={tplFacilities} onChange={(e) => setTplFacilities(e.target.value)} rows={6} className={`${inputClass} mt-2`} />
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
              <h3 className="font-display text-base font-bold text-charcoal">Chargeable items</h3>
              <textarea value={tplChargeable} onChange={(e) => setTplChargeable(e.target.value)} rows={6} className={`${inputClass} mt-2`} />
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
              <h3 className="font-display text-base font-bold text-charcoal">Policies</h3>
              <textarea value={tplPolicies} onChange={(e) => setTplPolicies(e.target.value)} rows={6} className={`${inputClass} mt-2`} />
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line space-y-3">
              <h3 className="font-display text-base font-bold text-charcoal">Contact & validity</h3>
              <div>
                <label className={labelClass}>Office timings</label>
                <input value={tplOffice} onChange={(e) => setTplOffice(e.target.value)} className={inputClass} placeholder="e.g. 10:00 AM – 6:00 PM" />
              </div>
              <div>
                <label className={labelClass}>Manager name</label>
                <input value={tplManagerName} onChange={(e) => setTplManagerName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Manager phone</label>
                <input value={tplManagerPhone} onChange={(e) => setTplManagerPhone(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Location link</label>
                <input value={tplLocation} onChange={(e) => setTplLocation(e.target.value)} className={inputClass} placeholder="https://maps.google.com/..." />
              </div>
              <div>
                <label className={labelClass}>Validity (days)</label>
                <input type="number" min={1} max={365} value={tplValidity} onChange={(e) => setTplValidity(Number(e.target.value))} className={inputClass} />
              </div>
              {!tplManagerName || !tplOffice || !tplLocation ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Settings me manager contact, office timings ya location link blank hai — template me placeholder khali rahega. Inhe yahan bharein.
                </p>
              ) : null}
            </div>
          </div>
          {tplErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{tplErr}</p>}
          {tplMsg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{tplMsg}</p>}
          <button type="submit" data-requires-auth disabled={tplBusy} className={goldButtonClass}>
            {tplBusy ? "Saving…" : "Save Template"}
          </button>
        </form>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line space-y-3">
              <h2 className="font-display text-lg font-bold text-charcoal">New Quotation</h2>
              <div>
                <label className={labelClass}>Client name *</label>
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Client phone *</label>
                <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={inputClass} placeholder="03xx-xxxxxxx" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Source</label>
                  <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Event type</label>
                  <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={inputClass}>
                    {EVENT_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Event date</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Slot</label>
                  <select value={slot} onChange={(e) => setSlot(e.target.value as "day" | "night")} className={inputClass}>
                    <option value="day">Day (12:00–4:00)</option>
                    <option value="night">Night (7:00–11:00)</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Guest count</label>
                  <input type="number" min={0} value={guestCount} onChange={(e) => setGuestCount(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Hall</label>
                  <select value={hallId} onChange={(e) => setHallId(e.target.value)} className={inputClass}>
                    {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    {halls.length === 0 && <option value="">MARQUE ONE</option>}
                  </select>
                </div>
              </div>
              {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{formError}</p>}
              <button type="button" data-requires-auth onClick={() => void onSend()} disabled={busy} className={goldButtonClass}>
                <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send on WhatsApp"}
              </button>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
              <h2 className="font-display text-lg font-bold text-charcoal">Live preview</h2>
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-offwhite p-3 text-xs text-charcoal">{preview}</pre>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-line">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-charcoal">Quotations</h2>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name/phone/enquiry…" className={`${inputClass} ps-9`} />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
                  <option value="">All</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                </select>
              </div>
            </div>
            {listLoading ? (
              <LoadingState />
            ) : quotations.length === 0 ? (
              <EmptyState message="No quotations yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-150 text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-line text-xs uppercase tracking-wide text-ink/50">
                      <th className="px-3 py-2">Enquiry #</th>
                      <th className="px-3 py-2">Client</th>
                      <th className="px-3 py-2">Event date</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Validity</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.map((q) => (
                      <tr key={q.id} className="border-b border-stone-line last:border-0 hover:bg-offwhite">
                        <td className="px-3 py-2.5 font-semibold text-charcoal">{q.enquiry_no}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-charcoal">{q.client_name}</p>
                          <p className="text-xs text-ink/60" dir="ltr">{q.client_phone}</p>
                        </td>
                        <td className="px-3 py-2.5">{q.event_date ? formatDate(q.event_date) : "—"}</td>
                        <td className="px-3 py-2.5">
                          <Badge tone={q.status === "sent" ? "green" : "amber"}>{q.status}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          {q.valid_until ? (
                            isExpired(q.valid_until) ? (
                              <Badge tone="red">Expired</Badge>
                            ) : (
                              <span className="text-xs text-ink/60">Valid until {formatDate(q.valid_until)}</span>
                            )
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => setViewQ(q)} className={secondaryButtonClass}>View</button>
                            <button type="button" onClick={() => resend(q)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                              <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {viewQ && (
        <Modal title={`${viewQ.enquiry_no} — ${viewQ.client_name}`} onClose={() => setViewQ(null)}>
          <pre className="print-area max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg bg-offwhite p-3 text-xs text-charcoal">{viewQ.message_body || ""}</pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} className={secondaryButtonClass}>
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
            <button type="button" onClick={() => resend(viewQ)} className={goldButtonClass}>
              <Send className="h-4 w-4" /> Send on WhatsApp
            </button>
            <button type="button" onClick={() => setViewQ(null)} className={secondaryButtonClass}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
