// SAMPLE DATA — demo only.
// Used ONLY when NEXT_PUBLIC_USE_SAMPLE_DATA=true. Every page then shows a
// visible "SAMPLE DATA — demo only" banner. Default is false (real API only).
// These are invented example rows for UI preview; they are NOT client data.

import type {
  AttendanceRow,
  AvailabilityDay,
  Booking,
  Customer,
  DashboardSummary,
  Employee,
  Hall,
  HallTable,
  Payment,
  RevenuePoint,
} from "./types";

export const SAMPLE_HALL: Hall = {
  id: "hall-1",
  name: "MARQUE ONE",
  capacity_guests: 500,
  capacity_tables: 50,
  day_price: 150000,
  night_price: 300000,
  is_active: true,
};

export const SAMPLE_CUSTOMERS: Customer[] = [
  { id: "cus-1", full_name: "Ahmed Raza", phone: "0301-2345678", address: "Gulshan-e-Iqbal, Karachi", email: "ahmed@example.com" },
  { id: "cus-2", full_name: "Ayesha Malik", phone: "0322-9876543", address: "North Nazimabad, Karachi" },
  { id: "cus-3", full_name: "Bilal Hussain", phone: "0333-1122334", address: "Defence, Karachi" },
  { id: "cus-4", full_name: "Fatima Zahra", phone: "0345-5566778", address: "PECHS, Karachi" },
  { id: "cus-5", full_name: "Usman Ghani", phone: "0300-9988776", address: "Malir, Karachi" },
];

export const SAMPLE_BOOKINGS: Booking[] = [
  { id: "bk-1", booking_code: "MQ-2026-0001", customer_id: "cus-1", customer_name: "Ahmed Raza", customer_phone: "0301-2345678", hall_id: "hall-1", hall_name: "MARQUE ONE", event_type: "Barat", event_date: "2026-11-14", slot: "night", guest_count: 400, tables_required: 40, special_instructions: "Stage decoration in gold theme.", total_price: 300000, advance_amount: 150000, amount_paid: 150000, balance_amount: 150000, payment_status: "partially_paid", status: "confirmed", created_at: "2026-10-20T10:00:00Z" },
  { id: "bk-2", booking_code: "MQ-2026-0002", customer_id: "cus-2", customer_name: "Ayesha Malik", customer_phone: "0322-9876543", hall_id: "hall-1", hall_name: "MARQUE ONE", event_type: "Walima", event_date: "2026-11-15", slot: "day", guest_count: 300, tables_required: 30, total_price: 150000, advance_amount: 75000, amount_paid: 150000, balance_amount: 0, payment_status: "fully_paid", status: "confirmed", created_at: "2026-10-22T11:00:00Z" },
  { id: "bk-3", booking_code: "MQ-2026-0003", customer_id: "cus-3", customer_name: "Bilal Hussain", customer_phone: "0333-1122334", hall_id: "hall-1", hall_name: "MARQUE ONE", event_type: "Mehndi", event_date: "2026-11-20", slot: "night", guest_count: 250, tables_required: 25, total_price: 300000, advance_amount: 150000, amount_paid: 0, balance_amount: 300000, payment_status: "unpaid", status: "pending", created_at: "2026-11-01T09:30:00Z" },
  { id: "bk-4", booking_code: "MQ-2026-0004", customer_id: "cus-4", customer_name: "Fatima Zahra", customer_phone: "0345-5566778", hall_id: "hall-1", hall_name: "MARQUE ONE", event_type: "Wedding", event_date: "2026-11-21", slot: "night", guest_count: 450, tables_required: 45, total_price: 300000, advance_amount: 150000, amount_paid: 100000, balance_amount: 200000, payment_status: "partially_paid", status: "confirmed", created_at: "2026-11-03T14:00:00Z" },
  { id: "bk-5", booking_code: "MQ-2026-0005", customer_id: "cus-5", customer_name: "Usman Ghani", customer_phone: "0300-9988776", hall_id: "hall-1", hall_name: "MARQUE ONE", event_type: "Nikkah", event_date: "2026-11-08", slot: "day", guest_count: 150, tables_required: 15, total_price: 150000, advance_amount: 75000, amount_paid: 150000, balance_amount: 0, payment_status: "fully_paid", status: "completed", completed_at: "2026-11-08T20:00:00Z", created_at: "2026-10-15T12:00:00Z" },
  { id: "bk-6", booking_code: "MQ-2026-0006", customer_id: "cus-1", customer_name: "Ahmed Raza", customer_phone: "0301-2345678", hall_id: "hall-1", hall_name: "MARQUE ONE", event_type: "Engagement", event_date: "2026-11-28", slot: "day", guest_count: 200, tables_required: 20, total_price: 150000, advance_amount: 75000, amount_paid: 0, balance_amount: 150000, payment_status: "unpaid", status: "pending", created_at: "2026-11-05T10:00:00Z" },
];

export const SAMPLE_PAYMENTS: Payment[] = [
  { id: "pay-1", booking_id: "bk-1", booking_code: "MQ-2026-0001", customer_name: "Ahmed Raza", amount: 150000, payment_date: "2026-10-20", method: "bank_transfer", reference: "TRX-881201", receipt_number: "RCP-2026-0001", is_voided: false, created_at: "2026-10-20T10:05:00Z" },
  { id: "pay-2", booking_id: "bk-2", booking_code: "MQ-2026-0002", customer_name: "Ayesha Malik", amount: 75000, payment_date: "2026-10-22", method: "cash", reference: "", receipt_number: "RCP-2026-0002", is_voided: false, created_at: "2026-10-22T11:05:00Z" },
  { id: "pay-3", booking_id: "bk-2", booking_code: "MQ-2026-0002", customer_name: "Ayesha Malik", amount: 75000, payment_date: "2026-11-02", method: "jazzcash", reference: "JC-55201", receipt_number: "RCP-2026-0003", is_voided: false, created_at: "2026-11-02T09:00:00Z" },
  { id: "pay-4", booking_id: "bk-4", booking_code: "MQ-2026-0004", customer_name: "Fatima Zahra", amount: 100000, payment_date: "2026-11-03", method: "cash", reference: "", receipt_number: "RCP-2026-0004", is_voided: false, created_at: "2026-11-03T14:05:00Z" },
  { id: "pay-5", booking_id: "bk-5", booking_code: "MQ-2026-0005", customer_name: "Usman Ghani", amount: 150000, payment_date: "2026-10-15", method: "bank_transfer", reference: "TRX-770011", receipt_number: "RCP-2026-0005", is_voided: false, created_at: "2026-10-15T12:05:00Z" },
];

export const SAMPLE_TABLES: HallTable[] = Array.from({ length: 12 }, (_, i) => ({
  id: `tbl-${i + 1}`,
  hall_id: "hall-1",
  table_number: `T-${String(i + 1).padStart(2, "0")}`,
  capacity: 10,
  is_active: i !== 11,
}));

export const SAMPLE_EMPLOYEES: Employee[] = [
  { id: "emp-1", employee_code: "EMP-0001", full_name: "Ali Nawaz", phone: "0301-1111111", role: "manager", is_active: true, hire_date: "2024-01-15" },
  { id: "emp-2", employee_code: "EMP-0002", full_name: "Hassan Ali", phone: "0302-2222222", role: "reception", is_active: true, hire_date: "2024-03-01" },
  { id: "emp-3", employee_code: "EMP-0003", full_name: "Imran Khan", phone: "0303-3333333", role: "waiter", is_active: true, hire_date: "2025-06-10" },
  { id: "emp-4", employee_code: "EMP-0004", full_name: "Sana Tariq", phone: "0304-4444444", role: "waiter", is_active: true, hire_date: "2025-08-20" },
  { id: "emp-5", employee_code: "EMP-0005", full_name: "Bilal Ahmed", phone: "0305-5555555", role: "cook", is_active: false, hire_date: "2023-11-05" },
];

export const SAMPLE_ATTENDANCE: AttendanceRow[] = [
  { id: "att-1", employee_id: "emp-2", employee_name: "Hassan Ali", attendance_date: "2026-11-10", status: "present", check_in_at: "2026-11-10T04:05:00Z", check_out_at: null, is_late: false, late_minutes: 0, working_minutes: null },
  { id: "att-2", employee_id: "emp-3", employee_name: "Imran Khan", attendance_date: "2026-11-10", status: "present", check_in_at: "2026-11-10T04:25:00Z", check_out_at: null, is_late: true, late_minutes: 10, working_minutes: null },
  { id: "att-3", employee_id: "emp-4", employee_name: "Sana Tariq", attendance_date: "2026-11-10", status: "present", check_in_at: "2026-11-10T03:55:00Z", check_out_at: "2026-11-10T13:00:00Z", is_late: false, late_minutes: 0, working_minutes: 545 },
  { id: "att-4", employee_id: "emp-5", employee_name: "Bilal Ahmed", attendance_date: "2026-11-10", status: "absent", check_in_at: null, check_out_at: null, is_late: false, working_minutes: null },
];

export const SAMPLE_SUMMARY: DashboardSummary = {
  total_bookings: 6,
  todays_events: 1,
  upcoming_weddings: 4,
  confirmed_bookings: 3,
  pending_bookings: 2,
  total_revenue: 1450000,
  amount_received: 550000,
  outstanding_payments: 900000,
  total_employees: 5,
  todays_attendance: 3,
};

export const SAMPLE_REVENUE: RevenuePoint[] = [
  { label: "Jun", revenue: 900000, bookings: 3 },
  { label: "Jul", revenue: 1200000, bookings: 4 },
  { label: "Aug", revenue: 750000, bookings: 3 },
  { label: "Sep", revenue: 1500000, bookings: 5 },
  { label: "Oct", revenue: 1350000, bookings: 5 },
  { label: "Nov", revenue: 550000, bookings: 2 },
];

export function sampleAvailability(month: string): AvailabilityDay[] {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const booked: Record<string, { slot: "day" | "night"; status: "booked" | "pending" }> = {
    "2026-11-14": { slot: "night", status: "booked" },
    "2026-11-15": { slot: "day", status: "booked" },
    "2026-11-20": { slot: "night", status: "pending" },
    "2026-11-21": { slot: "night", status: "booked" },
    "2026-11-28": { slot: "day", status: "pending" },
  };
  const rows: AvailabilityDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const b = booked[date];
    rows.push({
      date,
      day: b && b.slot === "day" ? { status: b.status } : { status: "available" },
      night: b && b.slot === "night" ? { status: b.status } : { status: "available" },
    });
  }
  return rows;
}
