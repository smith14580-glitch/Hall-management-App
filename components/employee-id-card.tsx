"use client";

import { QRCodeSVG } from "qrcode.react";
import { formatDate } from "@/lib/format";
import type { Employee } from "@/lib/types";

export function EmployeeIdCard({ employee }: { employee: Employee }) {
  return (
    <div className="employee-id-card relative w-full max-w-90 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-stone-line">
      <div className="absolute -end-6 -top-10 select-none font-display text-8xl font-black text-gold/5">
        M1
      </div>
      <div className="relative flex items-center justify-between bg-charcoal px-4 py-3">
        <div>
          <p className="font-display text-lg font-bold leading-none text-white">
            MARQUE <span className="text-gold">ONE</span>
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/55">Employee ID Card</p>
        </div>
        <span className="rounded-md bg-gold px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-charcoal">
          Staff
        </span>
      </div>
      <div className="h-1 bg-gradient-to-r from-gold-dark via-gold to-gold-light" />
      <div className="relative flex items-start gap-4 p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold leading-tight text-charcoal">{employee.full_name}</p>
          <p className="mt-0.5 font-mono text-xs font-bold tracking-wide text-gold-dark">{employee.employee_code}</p>
          <dl className="mt-3 space-y-1.5 text-[11px]">
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-ink/45">Role</dt>
              <dd className="capitalize font-semibold text-charcoal">{employee.role}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-ink/45">Phone</dt>
              <dd dir="ltr" className="font-semibold text-charcoal">{employee.phone}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-ink/45">Joined</dt>
              <dd className="font-semibold text-charcoal">{employee.hire_date ? formatDate(employee.hire_date) : "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="shrink-0 rounded-lg bg-white p-2 ring-1 ring-stone-line">
          <QRCodeSVG value={employee.employee_code} size={86} level="M" />
          <p className="mt-1 max-w-21 text-center text-[8px] leading-tight text-ink/50">Scan for attendance</p>
        </div>
      </div>
      <div className="relative border-t border-dashed border-stone-line px-4 py-2 text-[8px] leading-tight text-ink/45">
        Property of Marque One. If found, please return to management.
      </div>
    </div>
  );
}
