// API layer — typed fetch wrapper for the FastAPI backend (ARCHITECTURE.md §4).
// Base URL: NEXT_PUBLIC_API_URL (default http://localhost:8000). All calls go
// to {API_URL}/api/v1. Responses are {success, data} or {success:false, error}.
// JWT access token (15 min) is sent as Bearer; on 401 it tries one refresh
// (POST /auth/refresh) and retries. If the backend is unreachable, callers get
// an ApiError with status 0 and an honest message — never fake data.
// Sample mode: ONLY when NEXT_PUBLIC_USE_SAMPLE_DATA=true, functions return
// clearly-labelled sample data (lib/sample.ts) and the UI shows a banner.

import type {
  AttendanceRow,
  AvailabilityDay,
  Booking,
  Customer,
  CustomerSummary,
  DashboardSummary,
  Employee,
  Hall,
  HallTable,
  Payment,
  Pricing,
  RevenuePoint,
  SettingItem,
  TableAllocation,
  User,
} from "./types";
import {
  SAMPLE_ATTENDANCE,
  SAMPLE_BOOKINGS,
  SAMPLE_CUSTOMERS,
  SAMPLE_EMPLOYEES,
  SAMPLE_HALL,
  SAMPLE_PAYMENTS,
  SAMPLE_REVENUE,
  SAMPLE_SUMMARY,
  SAMPLE_TABLES,
  sampleAvailability,
} from "./sample";

export const API_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
export const USE_SAMPLE_DATA =
  process.env.NEXT_PUBLIC_USE_SAMPLE_DATA === "true";

// A visitor without a session can browse every page in "demo view" with
// clearly-labelled sample data. Writes still require a real login.
export const LOGIN_REQUIRED_EVENT = "marqueone:login-required";

export function hasSession(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(ACCESS_KEY) && window.localStorage.getItem(USER_KEY));
}

function demoActive(): boolean {
  return USE_SAMPLE_DATA || !hasSession();
}

function requireLogin(): void {
  if (hasSession()) return;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LOGIN_REQUIRED_EVENT));
  }
  throw new ApiError(
    401,
    "LOGIN_REQUIRED",
    "Ye action ke liye login zaroori hai — pehle login karein. / Login is required for this action.",
  );
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isConnectionError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 0;
}

const ACCESS_KEY = "marqueone_access_token";
const REFRESH_KEY = "marqueone_refresh_token";
const USER_KEY = "marqueone_user";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function saveSession(access: string, refresh: string, user: User): void {
  window.localStorage.setItem(ACCESS_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
}

function unwrap<T>(json: unknown): T {
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if ("data" in obj) return obj.data as T;
    if ("success" in obj && obj.success === false) {
      const err = (obj.error as Record<string, unknown>) || {};
      throw new ApiError(400, String(err.code || "API_ERROR"), String(err.message || "Request failed."));
    }
  }
  return json as T;
}

export function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
    if (Array.isArray(obj.bookings)) return obj.bookings as T[];
    if (Array.isArray(obj.payments)) return obj.payments as T[];
    if (Array.isArray(obj.customers)) return obj.customers as T[];
    if (Array.isArray(obj.employees)) return obj.employees as T[];
    if (Array.isArray(obj.tables)) return obj.tables as T[];
  }
  return [];
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = window.localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    const data = unwrap<{ access_token: string; refresh_token?: string }>(json);
    window.localStorage.setItem(ACCESS_KEY, data.access_token);
    if (data.refresh_token) window.localStorage.setItem(REFRESH_KEY, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = auth ? getAccessToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "CONNECTION_ERROR",
      `Backend se connect nahi ho raha — ${API_URL} check karo. Backend (FastAPI) chal raha hai? NEXT_PUBLIC_API_URL sahi hai?`,
    );
  }

  if (res.status === 401 && auth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${getAccessToken()}` };
      try {
        res = await fetch(`${API_URL}/api/v1${path}`, {
          method,
          headers: retryHeaders,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } catch {
        throw new ApiError(0, "CONNECTION_ERROR", "Backend se connect nahi ho raha — dobara try karo.");
      }
    }
    if (res.status === 401) {
      clearSession();
      throw new ApiError(401, "UNAUTHORIZED", "Session khatam ho gaya hai — dobara login karo.");
    }
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(
      res.status,
      err?.code || `HTTP_${res.status}`,
      err?.message || `Request failed (${res.status}).`,
    );
  }
  return unwrap<T>(json);
}

// ---------- sample-mode helper ----------
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sample<T>(value: T): Promise<T> {
  await delay(250);
  return value;
}

// ---------- Auth (§4.1) ----------
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export async function login(phone: string, password: string): Promise<LoginResponse> {
  if (USE_SAMPLE_DATA) {
    // Demo login — NO API call. Fixed demo credentials documented in README
    // and on the login page. Anything else is rejected so nobody mistakes
    // sample mode for a real login.
    if (phone.trim() === "03000000000" && password === "demo1234") {
      const user: User = {
        id: "demo-manager",
        full_name: "Manager (Demo)",
        phone: "03000000000",
        role: "super_admin",
      };
      return sample({ access_token: "sample-access", refresh_token: "sample-refresh", token_type: "bearer", user });
    }
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Demo mode ON hai — demo login: phone 03000000000, password demo1234 / Demo mode is ON — demo login: phone 03000000000, password demo1234",
    );
  }
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: { phone, password },
    auth: false,
  });
}

export async function fetchMe(): Promise<User> {
  if (USE_SAMPLE_DATA) {
    const stored = getStoredUser();
    return sample(stored || { id: "user-1", full_name: "Manager (Sample)", phone: "0300-0000000", role: "super_admin" });
  }
  return apiFetch<User>("/auth/me");
}

export async function logout(): Promise<void> {
  if (!USE_SAMPLE_DATA) {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      /* logout still clears local session below */
    }
  }
  clearSession();
}

// ---------- Dashboard (§4.10) ----------
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  if (demoActive()) return sample(SAMPLE_SUMMARY);
  return apiFetch<DashboardSummary>("/dashboard/summary");
}

export async function fetchRevenue(period: string): Promise<RevenuePoint[]> {
  if (demoActive()) return sample(SAMPLE_REVENUE);
  const data = await apiFetch<unknown>(`/dashboard/revenue?period=${period}`);
  if (Array.isArray(data)) return data as RevenuePoint[];
  const obj = data as { series?: RevenuePoint[]; data?: RevenuePoint[] };
  return obj.series || obj.data || [];
}

// ---------- Bookings (§4.5) ----------
export interface BookingFilters {
  search?: string;
  status?: string;
  payment_status?: string;
  event_date?: string;
  date_from?: string;
  date_to?: string;
  slot?: string;
}

export async function fetchBookings(filters: BookingFilters = {}): Promise<Booking[]> {
  if (demoActive()) {
    let rows = [...SAMPLE_BOOKINGS];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (b) =>
          (b.customer_name || "").toLowerCase().includes(q) ||
          (b.customer_phone || "").includes(q) ||
          b.booking_code.toLowerCase().includes(q),
      );
    }
    if (filters.status) rows = rows.filter((b) => b.status === filters.status);
    if (filters.payment_status) rows = rows.filter((b) => b.payment_status === filters.payment_status);
    if (filters.slot) rows = rows.filter((b) => b.slot === filters.slot);
    if (filters.event_date) rows = rows.filter((b) => b.event_date === filters.event_date);
    return sample(rows);
  }
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const q = params.toString();
  return asArray<Booking>(await apiFetch<unknown>(`/bookings${q ? `?${q}` : ""}`));
}

export async function fetchBooking(id: string): Promise<Booking> {
  if (demoActive()) {
    const b = SAMPLE_BOOKINGS.find((x) => x.id === id || x.booking_code === id);
    if (!b) throw new ApiError(404, "NOT_FOUND", "Booking nahi mili.");
    return sample(b);
  }
  return apiFetch<Booking>(`/bookings/${id}`);
}

export async function createBooking(body: Record<string, unknown>): Promise<Booking> {
  requireLogin();
  if (demoActive()) {
    const created: Booking = {
      id: `bk-${Date.now()}`,
      booking_code: `MQ-2026-${String(SAMPLE_BOOKINGS.length + 1).padStart(4, "0")}`,
      customer_id: "cus-new",
      customer_name: String(body.customer_name || ""),
      customer_phone: String(body.phone || ""),
      hall_id: "hall-1",
      hall_name: "MARQUE ONE",
      event_type: String(body.event_type || "Wedding"),
      event_date: String(body.event_date || ""),
      slot: (body.slot as "day" | "night") || "night",
      guest_count: Number(body.guest_count || 0),
      tables_required: Number(body.tables_required || 0),
      special_instructions: (body.special_instructions as string) || null,
      total_price: Number(body.total_price || 0),
      advance_amount: Number(body.advance_amount || 0),
      amount_paid: 0,
      balance_amount: Number(body.total_price || 0),
      payment_status: "unpaid",
      status: "pending",
    };
    return sample(created);
  }
  return apiFetch<Booking>("/bookings", { method: "POST", body });
}

export async function updateBooking(id: string, body: Record<string, unknown>): Promise<Booking> {
  requireLogin();
  if (demoActive()) return sample({ ...(await fetchBooking(id)), ...body } as Booking);
  return apiFetch<Booking>(`/bookings/${id}`, { method: "PATCH", body });
}

export async function bookingAction(id: string, action: "confirm" | "cancel" | "complete", body?: Record<string, unknown>): Promise<Booking> {
  requireLogin();
  if (demoActive()) {
    const b = await fetchBooking(id);
    const status = action === "confirm" ? "confirmed" : action === "cancel" ? "cancelled" : "completed";
    return sample({ ...b, status } as Booking);
  }
  return apiFetch<Booking>(`/bookings/${id}/${action}`, { method: "POST", body: body || {} });
}

export async function fetchUpcomingBookings(): Promise<Booking[]> {
  if (demoActive()) return sample(SAMPLE_BOOKINGS.filter((b) => b.status === "confirmed" || b.status === "pending"));
  return asArray<Booking>(await apiFetch<unknown>("/bookings/upcoming"));
}

export async function fetchTodaysBookings(): Promise<Booking[]> {
  if (demoActive()) return sample([]);
  return asArray<Booking>(await apiFetch<unknown>("/bookings/today"));
}

// ---------- Availability & calendar (§4.6) ----------
export async function fetchAvailability(month: string, hallId?: string): Promise<AvailabilityDay[]> {
  if (demoActive()) return sample(sampleAvailability(month));
  const q = new URLSearchParams({ month });
  if (hallId) q.set("hall_id", hallId);
  const data = await apiFetch<unknown>(`/availability?${q.toString()}`);
  if (Array.isArray(data)) return data as AvailabilityDay[];
  const obj = data as { days?: AvailabilityDay[] };
  return obj.days || [];
}

export async function checkAvailability(hallId: string, eventDate: string, slot: string): Promise<{ available: boolean; conflicting_booking_code?: string }> {
  if (demoActive()) {
    const clash = SAMPLE_BOOKINGS.find(
      (b) => b.event_date === eventDate && b.slot === slot && (b.status === "pending" || b.status === "confirmed"),
    );
    return sample({ available: !clash, conflicting_booking_code: clash?.booking_code });
  }
  const q = new URLSearchParams({ hall_id: hallId, event_date: eventDate, slot });
  return apiFetch<{ available: boolean; conflicting_booking_code?: string }>(`/availability/check?${q.toString()}`);
}

// ---------- Customers (§4.3) ----------
export async function fetchCustomers(search = ""): Promise<Customer[]> {
  if (demoActive()) {
    const q = search.toLowerCase();
    return sample(
      q
        ? SAMPLE_CUSTOMERS.filter((c) => c.full_name.toLowerCase().includes(q) || c.phone.includes(q))
        : SAMPLE_CUSTOMERS,
    );
  }
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return asArray<Customer>(await apiFetch<unknown>(`/customers${q}`));
}

export async function fetchCustomer(id: string): Promise<Customer> {
  if (demoActive()) {
    const c = SAMPLE_CUSTOMERS.find((x) => x.id === id);
    if (!c) throw new ApiError(404, "NOT_FOUND", "Customer nahi mila.");
    return sample(c);
  }
  return apiFetch<Customer>(`/customers/${id}`);
}

export async function fetchCustomerBookings(id: string): Promise<Booking[]> {
  if (demoActive()) return sample(SAMPLE_BOOKINGS.filter((b) => b.customer_id === id));
  return asArray<Booking>(await apiFetch<unknown>(`/customers/${id}/bookings`));
}

export async function fetchCustomerSummary(id: string): Promise<CustomerSummary> {
  if (demoActive()) {
    const rows = SAMPLE_BOOKINGS.filter((b) => b.customer_id === id);
    return sample({
      total_bookings: rows.length,
      total_paid: rows.reduce((s, b) => s + b.amount_paid, 0),
      total_outstanding: rows.reduce((s, b) => s + b.balance_amount, 0),
    });
  }
  return apiFetch<CustomerSummary>(`/customers/${id}/summary`);
}

// ---------- Halls & pricing (§4.4) ----------
export async function fetchHalls(): Promise<Hall[]> {
  if (demoActive()) return sample([SAMPLE_HALL]);
  return asArray<Hall>(await apiFetch<unknown>("/halls"));
}

export async function fetchPricing(): Promise<Pricing> {
  if (demoActive()) return sample({ day_price: SAMPLE_HALL.day_price, night_price: SAMPLE_HALL.night_price, hall_id: "hall-1", hall_name: "MARQUE ONE" });
  return apiFetch<Pricing>("/pricing/current");
}

export async function updateHall(id: string, body: Record<string, unknown>): Promise<Hall> {
  requireLogin();
  if (demoActive()) return sample({ ...SAMPLE_HALL, ...body } as Hall);
  return apiFetch<Hall>(`/halls/${id}`, { method: "PATCH", body });
}

// ---------- Payments (§4.7) ----------
export async function fetchBookingPayments(bookingId: string): Promise<Payment[]> {
  if (demoActive()) return sample(SAMPLE_PAYMENTS.filter((p) => p.booking_id === bookingId));
  return asArray<Payment>(await apiFetch<unknown>(`/bookings/${bookingId}/payments`));
}

export async function recordPayment(bookingId: string, body: Record<string, unknown>): Promise<Payment> {
  requireLogin();
  if (demoActive()) {
    const booking = SAMPLE_BOOKINGS.find((b) => b.id === bookingId);
    return sample({
      id: `pay-${Date.now()}`,
      booking_id: bookingId,
      booking_code: booking?.booking_code,
      customer_name: booking?.customer_name,
      amount: Number(body.amount || 0),
      payment_date: String(body.payment_date || ""),
      method: String(body.method || "cash"),
      reference: (body.reference as string) || null,
      receipt_number: `RCP-2026-${String(SAMPLE_PAYMENTS.length + 1).padStart(4, "0")}`,
      is_voided: false,
    });
  }
  return apiFetch<Payment>(`/bookings/${bookingId}/payments`, { method: "POST", body });
}

export async function voidPayment(paymentId: string, reason: string): Promise<Payment> {
  requireLogin();
  if (demoActive()) {
    const p = SAMPLE_PAYMENTS.find((x) => x.id === paymentId);
    if (!p) throw new ApiError(404, "NOT_FOUND", "Payment nahi mili.");
    return sample({ ...p, is_voided: true, void_reason: reason });
  }
  return apiFetch<Payment>(`/payments/${paymentId}/void`, { method: "POST", body: { reason } });
}

export async function fetchOutstanding(): Promise<Booking[]> {
  if (demoActive()) return sample(SAMPLE_BOOKINGS.filter((b) => b.balance_amount > 0 && b.status !== "cancelled"));
  return asArray<Booking>(await apiFetch<unknown>("/payments/outstanding"));
}

export async function fetchAllPayments(): Promise<Payment[]> {
  if (demoActive()) return sample(SAMPLE_PAYMENTS);
  // No global payments list endpoint in §4 — build it from recent bookings.
  const bookings = await fetchBookings({});
  const lists = await Promise.all(
    bookings.slice(0, 15).map((b) => fetchBookingPayments(b.id).catch(() => [] as Payment[])),
  );
  return lists.flat().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

// ---------- Tables (§4.8) ----------
export async function fetchTables(hallId?: string): Promise<HallTable[]> {
  if (demoActive()) return sample(SAMPLE_TABLES);
  const q = hallId ? `?hall_id=${hallId}` : "";
  return asArray<HallTable>(await apiFetch<unknown>(`/tables${q}`));
}

export async function createTable(body: Record<string, unknown>): Promise<HallTable> {
  requireLogin();
  if (demoActive()) {
    return sample({ id: `tbl-${Date.now()}`, hall_id: "hall-1", table_number: String(body.table_number || ""), capacity: Number(body.capacity || 10), is_active: true });
  }
  return apiFetch<HallTable>("/tables", { method: "POST", body });
}

export async function updateTable(id: string, body: Record<string, unknown>): Promise<HallTable> {
  requireLogin();
  if (demoActive()) {
    const t = SAMPLE_TABLES.find((x) => x.id === id);
    if (!t) throw new ApiError(404, "NOT_FOUND", "Table nahi mili.");
    return sample({ ...t, ...body } as HallTable);
  }
  return apiFetch<HallTable>(`/tables/${id}`, { method: "PATCH", body });
}

export async function activateTable(id: string): Promise<HallTable> {
  requireLogin();
  if (demoActive()) {
    const t = SAMPLE_TABLES.find((x) => x.id === id);
    if (!t) throw new ApiError(404, "NOT_FOUND", "Table nahi mili.");
    return sample({ ...t, is_active: true } as HallTable);
  }
  return apiFetch<HallTable>(`/tables/${id}/activate`, { method: "POST" });
}

export async function deactivateTable(id: string): Promise<void> {
  requireLogin();
  if (demoActive()) return sample(undefined);
  await apiFetch(`/tables/${id}/deactivate`, { method: "POST" });
}

export async function fetchBookingTables(bookingId: string): Promise<TableAllocation[]> {
  if (demoActive()) return sample([]);
  return asArray<TableAllocation>(await apiFetch<unknown>(`/bookings/${bookingId}/tables`));
}

export async function allocateTables(bookingId: string, tableIds: string[]): Promise<TableAllocation[]> {
  requireLogin();
  if (demoActive()) return sample(tableIds.map((tid, i) => ({ id: `al-${i}`, booking_id: bookingId, table_id: tid })));
  return asArray<TableAllocation>(
    await apiFetch<unknown>(`/bookings/${bookingId}/tables`, { method: "POST", body: { table_ids: tableIds } }),
  );
}

// ---------- Employees (§4.2) ----------
export async function fetchEmployees(search = ""): Promise<Employee[]> {
  if (demoActive()) {
    const q = search.toLowerCase();
    return sample(
      q
        ? SAMPLE_EMPLOYEES.filter((e) => e.full_name.toLowerCase().includes(q) || e.employee_code.toLowerCase().includes(q))
        : SAMPLE_EMPLOYEES,
    );
  }
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return asArray<Employee>(await apiFetch<unknown>(`/employees${q}`));
}

export async function createEmployee(body: Record<string, unknown>): Promise<Employee> {
  requireLogin();
  if (demoActive()) {
    return sample({
      id: `emp-${Date.now()}`,
      employee_code: `EMP-${String(SAMPLE_EMPLOYEES.length + 1).padStart(4, "0")}`,
      full_name: String(body.full_name || ""),
      phone: String(body.phone || ""),
      role: String(body.role || "waiter"),
      is_active: true,
    });
  }
  return apiFetch<Employee>("/employees", { method: "POST", body });
}

export async function updateEmployee(id: string, body: Record<string, unknown>): Promise<Employee> {
  requireLogin();
  if (demoActive()) {
    const e = SAMPLE_EMPLOYEES.find((x) => x.id === id);
    if (!e) throw new ApiError(404, "NOT_FOUND", "Employee nahi mila.");
    return sample({ ...e, ...body } as Employee);
  }
  return apiFetch<Employee>(`/employees/${id}`, { method: "PATCH", body });
}

export async function deactivateEmployee(id: string): Promise<void> {
  requireLogin();
  if (demoActive()) return sample(undefined);
  await apiFetch(`/employees/${id}/deactivate`, { method: "POST" });
}

// ---------- Attendance (§4.9) ----------
export async function checkIn(): Promise<AttendanceRow> {
  requireLogin();
  if (demoActive()) {
    return sample({
      id: `att-${Date.now()}`,
      employee_id: "emp-3",
      employee_name: "Imran Khan",
      attendance_date: new Date().toISOString().slice(0, 10),
      status: "present",
      check_in_at: new Date().toISOString(),
      check_out_at: null,
      is_late: false,
      working_minutes: null,
    });
  }
  return apiFetch<AttendanceRow>("/attendance/check-in", { method: "POST", body: {} });
}

export async function checkOut(): Promise<AttendanceRow> {
  requireLogin();
  if (demoActive()) {
    return sample({
      id: `att-${Date.now()}`,
      employee_id: "emp-3",
      employee_name: "Imran Khan",
      attendance_date: new Date().toISOString().slice(0, 10),
      status: "present",
      check_in_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      check_out_at: new Date().toISOString(),
      is_late: false,
      working_minutes: 480,
    });
  }
  return apiFetch<AttendanceRow>("/attendance/check-out", { method: "POST", body: {} });
}

export async function fetchMyAttendance(month: string): Promise<AttendanceRow[]> {
  if (demoActive()) return sample(SAMPLE_ATTENDANCE);
  return asArray<AttendanceRow>(await apiFetch<unknown>(`/attendance/me?month=${month}`));
}

export async function fetchTodayAttendance(): Promise<AttendanceRow[]> {
  if (demoActive()) return sample(SAMPLE_ATTENDANCE);
  return asArray<AttendanceRow>(await apiFetch<unknown>("/attendance/today"));
}

export async function fetchAttendance(month: string, employeeId?: string): Promise<AttendanceRow[]> {
  if (demoActive()) return sample(SAMPLE_ATTENDANCE);
  const q = new URLSearchParams({ month });
  if (employeeId) q.set("employee_id", employeeId);
  return asArray<AttendanceRow>(await apiFetch<unknown>(`/attendance?${q.toString()}`));
}

export async function markAttendance(body: Record<string, unknown>): Promise<AttendanceRow> {
  requireLogin();
  if (demoActive()) {
    return sample({
      id: `att-${Date.now()}`,
      employee_id: String(body.employee_id || ""),
      attendance_date: String(body.attendance_date || ""),
      status: (body.status as AttendanceRow["status"]) || "present",
      check_in_at: null,
      check_out_at: null,
      is_late: false,
      working_minutes: null,
    });
  }
  return apiFetch<AttendanceRow>("/attendance/mark", { method: "POST", body });
}

// ---------- Reports (§4.10) ----------
export async function fetchReport(kind: "bookings" | "revenue" | "outstanding" | "attendance", params: Record<string, string> = {}): Promise<unknown> {
  if (demoActive()) {
    if (kind === "outstanding") return sample(SAMPLE_BOOKINGS.filter((b) => b.balance_amount > 0));
    if (kind === "attendance") return sample(SAMPLE_ATTENDANCE);
    if (kind === "revenue") return sample(SAMPLE_REVENUE);
    return sample(SAMPLE_BOOKINGS);
  }
  const q = new URLSearchParams(params).toString();
  return apiFetch<unknown>(`/reports/${kind}${q ? `?${q}` : ""}`);
}

// ---------- Settings & audit (§4.12) ----------
export async function fetchSettings(): Promise<SettingItem[]> {
  if (demoActive()) {
    return sample([
      { key: "hall_day_price", value: "150000", description: "Day booking price (PKR) — UNCONFIRMED, see ARCHITECTURE.md Q2" },
      { key: "hall_night_price", value: "300000", description: "Night booking price (PKR)" },
      { key: "default_advance_percent", value: "50", description: "Default advance % of total" },
      { key: "duty_start_time", value: "09:00", description: "Staff duty start time" },
      { key: "late_grace_minutes", value: "15", description: "Grace minutes before late" },
      { key: "slot_day_start", value: "12:00", description: "Day slot start" },
      { key: "slot_day_end", value: "16:00", description: "Day slot end" },
      { key: "slot_night_start", value: "19:00", description: "Night slot start" },
      { key: "slot_night_end", value: "23:00", description: "Night slot end" },
      { key: "app_name", value: "MARQUE ONE", description: "Application name" },
    ]);
  }
  const data = await apiFetch<unknown>("/settings");
  if (Array.isArray(data)) return data as SettingItem[];
  const obj = data as Record<string, unknown>;
  return Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
}

export async function updateSetting(key: string, value: string): Promise<void> {
  requireLogin();
  if (demoActive()) return sample(undefined);
  await apiFetch(`/settings/${encodeURIComponent(key)}`, { method: "PATCH", body: { value } });
}

export async function fetchAuditLogs(): Promise<unknown[]> {
  if (demoActive()) return sample([]);
  return asArray(await apiFetch<unknown>("/audit-logs"));
}
