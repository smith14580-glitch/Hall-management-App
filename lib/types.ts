// Types mirror the FastAPI Pydantic schemas in ARCHITECTURE.md §3/§4.
// Money is always a number (PKR); the backend stores NUMERIC(12,2).

export type Role = "super_admin" | "staff" | "waiter";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus = "unpaid" | "partially_paid" | "fully_paid";
export type Slot = "day" | "night";
export type SlotStatus = "available" | "pending" | "booked" | "cancelled";
export type AttendanceStatus = "present" | "absent" | "leave" | "half_day";

export interface User {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  role: Role;
  role_id?: number;
  employee_id?: string | null;
  is_active?: boolean;
}

export interface Hall {
  id: string;
  name: string;
  capacity_guests: number | null;
  capacity_tables: number | null;
  day_price: number;
  night_price: number;
  is_active: boolean;
}

export interface Pricing {
  day_price: number;
  night_price: number;
  hall_id?: string;
  hall_name?: string;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  alternate_phone?: string | null;
  address?: string | null;
  email?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface CustomerSummary {
  total_bookings: number;
  total_paid: number;
  total_outstanding: number;
}

export interface Booking {
  id: string;
  booking_code: string;
  customer_id: string;
  customer?: Customer;
  customer_name?: string;
  customer_phone?: string;
  hall_id: string;
  hall_name?: string;
  event_type: string;
  event_date: string;
  slot: Slot;
  guest_count: number;
  tables_required: number;
  special_instructions?: string | null;
  total_price: number;
  advance_amount: number;
  amount_paid: number;
  balance_amount: number;
  payment_status: PaymentStatus;
  status: BookingStatus;
  created_by?: string;
  cancelled_reason?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  booking_code?: string;
  customer_name?: string;
  amount: number;
  payment_date: string;
  method: string;
  reference?: string | null;
  receipt_number: string;
  is_voided: boolean;
  void_reason?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface HallTable {
  id: string;
  hall_id: string;
  table_number: string;
  capacity: number;
  is_active: boolean;
}

export interface TableAllocation {
  id: string;
  booking_id: string;
  table_id: string;
  table_number?: string;
  capacity?: number;
}

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  phone: string;
  role: string;
  cnic?: string | null;
  address?: string | null;
  hire_date?: string | null;
  duty_start_time?: string | null;
  monthly_salary?: number | null;
  is_active: boolean;
  user_id?: string | null;
}

export interface AttendanceRow {
  id: string;
  employee_id: string;
  employee_name?: string;
  attendance_date: string;
  status: AttendanceStatus;
  check_in_at?: string | null;
  check_out_at?: string | null;
  is_late: boolean;
  late_minutes?: number | null;
  working_minutes?: number | null;
  notes?: string | null;
}

export interface DashboardSummary {
  total_bookings: number;
  todays_events: number;
  upcoming_weddings: number;
  confirmed_bookings: number;
  pending_bookings: number;
  total_revenue: number;
  amount_received: number;
  outstanding_payments: number;
  total_employees: number;
  todays_attendance: number;
  [key: string]: number | string | undefined;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  bookings?: number;
}

export interface AvailabilityDay {
  date: string;
  day: { status: SlotStatus; booking_code?: string | null };
  night: { status: SlotStatus; booking_code?: string | null };
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SettingItem {
  key: string;
  value: string;
  description?: string | null;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  created_at: string;
}

export interface SalaryRecord {
  id: string;
  employee_id: string;
  employee_name?: string | null;
  employee_code?: string | null;
  month: string;
  base_amount: number;
  paid_amount: number;
  balance: number;
  payment_date?: string | null;
  status: "pending" | "partial" | "paid";
  notes?: string | null;
  created_at?: string;
}

export const EVENT_TYPES = [
  "Wedding",
  "Barat",
  "Walima",
  "Mehndi",
  "Engagement",
  "Nikkah",
  "Other",
] as const;

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
] as const;

export const NIGHT_PRICE_DEFAULT = 300000;
export const DAY_PRICE_DEFAULT = 150000; // UNCONFIRMED — see ARCHITECTURE.md §12 Q2
export const DEFAULT_ADVANCE_PERCENT = 50;
export const DEFAULT_DUTY_START = "09:00";
export const DEFAULT_LATE_GRACE_MINUTES = 15;
export const DEFAULT_SLOT_DAY = { start: "12:00", end: "16:00" };
export const DEFAULT_SLOT_NIGHT = { start: "19:00", end: "23:00" };
