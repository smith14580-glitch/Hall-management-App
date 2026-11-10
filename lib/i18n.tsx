import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Lang = "en" | "ur";

const DICTIONARIES: Record<Lang, Record<string, string>> = {
  en: {
    app_name: "MARQUE ONE",
    sign_in: "Sign in",
    phone: "Phone",
    password: "Password",
    signing_in: "Signing in...",
    login_failed: "Login failed",
    dashboard: "Dashboard",
    bookings: "Bookings",
    customers: "Customers",
    payments: "Payments",
    tables: "Tables",
    employees: "Employees",
    attendance: "Attendance",
    reports: "Reports",
    settings: "Settings",
    language: "Language",
    english: "English",
    urdu: "Urdu",
    logout: "Logout",
  },
  ur: {
    app_name: "MARQUE ONE",
    sign_in: "سائن ان کریں",
    phone: "فون نمبر",
    password: "پاس ورڈ",
    signing_in: "سائن ان ہو رہا ہے...",
    login_failed: "لاگ ان ناکام رہا",
    dashboard: "ڈیش بورڈ",
    bookings: "بکنگز",
    customers: "گاہک",
    payments: "ادائیگیاں",
    tables: "میزیں",
    employees: "ملازمین",
    attendance: "حاضرگی",
    reports: "رپورٹس",
    settings: "سیٹنگز",
    language: "زبان",
    english: "انگریزی",
    urdu: "اردو",
    logout: "لاگ آؤٹ",
  },
};

const I18nContext = createContext<{
  lang: Lang;
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
} | null>(null);

export function I18nProvider({ children, initialLang = "en" }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("marque_lang") as Lang | null;
      return saved === "en" || saved === "ur" ? saved : initialLang;
    }
    return initialLang;
  });

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    if (typeof window !== "undefined") localStorage.setItem("marque_lang", next);
  }, []);

  const t = useCallback((key: string) => {
    return DICTIONARIES[lang][key] ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
