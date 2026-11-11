// Language: English default, Urdu toggle (Urdu script + RTL).
// The architecture doc (§7.3, D23) said English-only v1, but the user asked
// for the EN/اردو toggle, so it is implemented here. Choice persists in
// localStorage. Data values (names, phone numbers, amounts) are never
// translated — only UI labels, nav, headings and buttons.

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "ur";

type Dict = Record<string, string>;

const EN: Dict = {
  dashboard: "Dashboard",
  bookings: "Bookings",
  newBooking: "New Booking",
  calendar: "Calendar",
  customers: "Customers",
  payments: "Payments",
  tables: "Tables",
  employees: "Employees",
  attendance: "Attendance",
  reports: "Reports",
  settings: "Settings",
  logout: "Logout",
  login: "Login",
  search: "Search",
  save: "Save",
  cancel: "Cancel",
  edit: "Edit",
  add: "Add",
  view: "View",
  back: "Back",
  retry: "Retry",
  loading: "Loading…",
  totalBookings: "Total Bookings",
  todaysEvents: "Today's Events",
  upcomingWeddings: "Upcoming Weddings",
  confirmed: "Confirmed",
  pending: "Pending",
  totalRevenue: "Total Revenue",
  amountReceived: "Amount Received",
  outstanding: "Outstanding",
  totalEmployees: "Total Employees",
  todaysAttendance: "Today's Attendance",
  recentBookings: "Recent Bookings",
  upcomingEvents: "Upcoming Events",
  quickActions: "Quick Actions",
  customer: "Customer",
  eventType: "Event Type",
  eventDate: "Event Date",
  slot: "Slot",
  day: "Day",
  night: "Night",
  guests: "Guests",
  total: "Total",
  paid: "Paid",
  balance: "Balance",
  status: "Status",
  paymentStatus: "Payment Status",
  actions: "Actions",
  phone: "Phone",
  address: "Address",
  name: "Name",
  role: "Role",
  capacity: "Capacity",
  active: "Active",
  inactive: "Inactive",
  present: "Present",
  absent: "Absent",
  checkIn: "Check In",
  checkOut: "Check Out",
  sampleBanner: "SAMPLE DATA — demo only. Not real bookings.",
  connectionTitle: "Backend se connect nahi ho raha",
  connectionBody: "Backend (FastAPI) chal raha hai? NEXT_PUBLIC_API_URL sahi hai?",
  noData: "No records yet.",
  managerApp: "Manager App",
  staffApp: "Staff App",
  demoView: "Demo view",
  demoViewBanner: "Demo view — live data ke liye login karein.",
  demoViewNote: "Aap demo data dekh rahe hain. Write actions ke liye login zaroori hai.",
  loginRequired: "Ye action ke liye login zaroori hai.",
  browseDemo: "Demo dekhein — bina login ke",
  addEmployee: "Add Employee",
  addTable: "Add Table",
  createBooking: "Create Booking",
  recordPayment: "Record Payment",
  confirmBooking: "Confirm Booking",
  completeBooking: "Mark Completed",
  cancelBooking: "Cancel Booking",
  downloadCsv: "Download CSV",
  markToday: "Mark for Today",
  staffNotice: "Staff account — sirf attendance aur apni info.",
  calendarAlert: "Calendar Alert",
  calendarAlertHint: "Upcoming booked dates (Day / Night)",
  searchDashboard: "Search bookings — customer, phone, booking ID, date…",
  viewRecord: "View record",
  alertHintClick: "Click a date to see the complete record (booking + payments).",
  completeRecord: "Complete Record",
  close: "Close",
  openBooking: "Open full booking",
  paymentHistory: "Payment History",
  noPayments: "No payments recorded.",
  salary: "Salary",
  salaryHistory: "Salary History",
  markPaid: "Mark Paid",
  attendanceBadge: "Attendance Badge",
  scanAttendance: "Scan Attendance (QR)",
  scanHint: "Employee ka QR badge scan karo ya employee code manual enter karo — attendance khud mark ho jayegi (check-in / check-out auto).",
  startScanner: "Start Scanner",
  stopScanner: "Stop Scanner",
  manualScan: "Manual Entry",
  employeeCode: "Employee Code",
  scanAction: "Action",
};

const UR: Dict = {
  dashboard: "ڈیش بورڈ",
  bookings: "بکنگز",
  newBooking: "نئی بکنگ",
  calendar: "کیلنڈر",
  customers: "گاہک",
  payments: "ادائیگیاں",
  tables: "میزیں",
  employees: "ملازمین",
  attendance: "حاضری",
  reports: "رپورٹس",
  settings: "سیٹنگز",
  logout: "لاگ آؤٹ",
  login: "لاگ ان",
  search: "تلاش",
  save: "محفوظ کریں",
  cancel: "منسوخ کریں",
  edit: "تبدیل کریں",
  add: "شامل کریں",
  view: "دیکھیں",
  back: "واپس",
  retry: "دوبارہ کوشش کریں",
  loading: "لوڈ ہو رہا ہے…",
  totalBookings: "کل بکنگز",
  todaysEvents: "آج کی تقریبات",
  upcomingWeddings: "آنے والی شادیاں",
  confirmed: "تصدیق شدہ",
  pending: "زیر التواء",
  totalRevenue: "کل آمدنی",
  amountReceived: "موصول شدہ رقم",
  outstanding: "بقایا رقم",
  totalEmployees: "کل ملازمین",
  todaysAttendance: "آج کی حاضری",
  recentBookings: "حالیہ بکنگز",
  upcomingEvents: "آنے والی تقریبات",
  quickActions: "فوری اقدامات",
  customer: "گاہک",
  eventType: "تقریب کی قسم",
  eventDate: "تقریب کی تاریخ",
  slot: "وقت",
  day: "دن",
  night: "رات",
  guests: "مہمان",
  total: "کل",
  paid: "ادا شدہ",
  balance: "بقایا",
  status: "حالت",
  paymentStatus: "ادائیگی کی حالت",
  actions: "کارروائی",
  phone: "فون",
  address: "پتہ",
  name: "نام",
  role: "عہدہ",
  capacity: "گنجائش",
  active: "فعال",
  inactive: "غیر فعال",
  present: "حاضر",
  absent: "غیر حاضر",
  checkIn: "چیک ان",
  checkOut: "چیک آؤٹ",
  sampleBanner: "نمونہ ڈیٹا — صرف ڈیمو کے لیے۔ اصلی بکنگز نہیں ہیں۔",
  connectionTitle: "بیک اینڈ سے رابطہ نہیں ہو رہا",
  connectionBody: "بیک اینڈ (FastAPI) چل رہا ہے؟ NEXT_PUBLIC_API_URL درست ہے؟",
  noData: "ابھی کوئی ریکارڈ نہیں ہے۔",
  managerApp: "مینجر ایپ",
  staffApp: "اسٹاف ایپ",
  demoView: "ڈیمو ویو",
  demoViewBanner: "ڈیمو ویو — لائیو ڈیٹا کے لیے لاگ ان کریں۔",
  demoViewNote: "آپ ڈیمو ڈیٹا دیکھ رہے ہیں۔ یہ کارروائیاں کرنے کے لیے لاگ ان ضروری ہے۔",
  loginRequired: "یہ کارروائی کرنے کے لیے لاگ ان ضروری ہے۔",
  browseDemo: "ڈیمو دیکھیں — بغیر لاگ ان",
  addEmployee: "ملازم شامل کریں",
  addTable: "میز شامل کریں",
  createBooking: "بکنگ بنائیں",
  recordPayment: "ادائیگی درج کریں",
  confirmBooking: "بکنگ کی تصدیق کریں",
  completeBooking: "مکمل قرار دیں",
  cancelBooking: "بکنگ منسوخ کریں",
  downloadCsv: "CSV ڈاؤن لوڈ کریں",
  markToday: "آج کے لیے نشان زد کریں",
  staffNotice: "اسٹاف اکاؤنٹ — صرف حاضری اور اپنی معلومات۔",
  calendarAlert: "کیلنڈر الرٹ",
  calendarAlertHint: "آنے والی بکنگ کی تاریخیں (دن / رات)",
  searchDashboard: "بکنگ تلاش کریں — گاہک، فون، بکنگ آئی ڈی، تاریخ…",
  viewRecord: "ریکارڈ دیکھیں",
  alertHintClick: "مکمل ریکارڈ (بکنگ + ادائیگیاں) دیکھنے کے لیے تاریخ پر کلک کریں۔",
  completeRecord: "مکمل ریکارڈ",
  close: "بند کریں",
  openBooking: "پوری بکنگ کھولیں",
  paymentHistory: "ادائیگیوں کی تاریخ",
  noPayments: "کوئی ادائیگی درج نہیں ہے۔",
  salary: "تنخواہ",
  salaryHistory: "تنخواہ کی تاریخ",
  markPaid: "ادا شدہ نشان زد کریں",
  attendanceBadge: "حاضری بیج",
  scanAttendance: "حاضری اسکین کریں (QR)",
  scanHint: "ملازم کا QR بیج اسکین کریں یا ملازم کوڈ دستی طور پر لکھیں — حاضری خود درج ہو جائے گی (چیک اِن / چیک آؤٹ خودکار)۔",
  startScanner: "اسکینر شروع کریں",
  stopScanner: "اسکینر بند کریں",
  manualScan: "دستی درج",
  employeeCode: "ملازم کوڈ",
  scanAction: "کارروائی",
};

const DICTS: Record<Language, Dict> = { en: EN, ur: UR };

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => undefined,
  t: (key: string) => EN[key] || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Lazy init from localStorage so no setState-in-effect is needed.
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    try {
      const saved = window.localStorage.getItem("marqueone_lang");
      return saved === "ur" || saved === "en" ? saved : "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang === "ur" ? "ur" : "en";
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    try {
      window.localStorage.setItem("marqueone_lang", lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const value: LanguageContextValue = {
    lang,
    setLang: setLangState,
    t: (key: string) => DICTS[lang][key] || EN[key] || key,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
