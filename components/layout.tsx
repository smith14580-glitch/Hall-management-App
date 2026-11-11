"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Clock,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { LOGIN_REQUIRED_EVENT, USE_SAMPLE_DATA } from "@/lib/api";
import { InstallAppButton } from "@/components/InstallAppButton";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  managerOnly: boolean;
}

const NAV: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: <LayoutDashboard className="h-5 w-5" />, managerOnly: true },
  { href: "/bookings", labelKey: "bookings", icon: <BookOpen className="h-5 w-5" />, managerOnly: true },
  { href: "/calendar", labelKey: "calendar", icon: <CalendarDays className="h-5 w-5" />, managerOnly: true },
  { href: "/customers", labelKey: "customers", icon: <Users className="h-5 w-5" />, managerOnly: true },
  { href: "/payments", labelKey: "payments", icon: <Wallet className="h-5 w-5" />, managerOnly: true },
  { href: "/tables", labelKey: "tables", icon: <Building2 className="h-5 w-5" />, managerOnly: true },
  { href: "/employees", labelKey: "employees", icon: <Users className="h-5 w-5" />, managerOnly: true },
  { href: "/attendance", labelKey: "attendance", icon: <Clock className="h-5 w-5" />, managerOnly: false },
  { href: "/reports", labelKey: "reports", icon: <BarChart3 className="h-5 w-5" />, managerOnly: true },
  { href: "/settings", labelKey: "settings", icon: <Settings className="h-5 w-5" />, managerOnly: true },
];

// Manager-only URL prefixes. Logged-in staff/waiter users are redirected to
// their attendance home (ARCHITECTURE.md §5.2). Demo visitors are NOT
// redirected — they can preview every page with sample data.
const MANAGER_PREFIXES = [
  "/bookings",
  "/calendar",
  "/customers",
  "/payments",
  "/tables",
  "/employees",
  "/reports",
  "/settings",
];

function isManagerPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return MANAGER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="flex overflow-hidden rounded-lg border border-stone-line bg-white text-sm font-semibold">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn("px-3 py-1.5", lang === "en" ? "bg-charcoal text-white" : "text-charcoal")}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("ur")}
        className={cn("px-3 py-1.5", lang === "ur" ? "bg-charcoal text-white" : "text-charcoal")}
        aria-pressed={lang === "ur"}
      >
        اردو
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, isManager, isDemo } = useAuth();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  // Never force login: visitors browse in demo view. Logged-in staff keep
  // their attendance-only home.
  useEffect(() => {
    if (loading || !user || isManager) return;
    if (isManagerPath(pathname)) router.replace("/attendance");
  }, [loading, user, isManager, pathname, router]);

  // Write actions dispatch this event when no session exists.
  useEffect(() => {
    const onLoginRequired = () => {
      const next =
        pathname && pathname !== "/login" ? `?reason=login&next=${encodeURIComponent(pathname)}` : "?reason=login";
      router.push(`/login${next}`);
    };
    window.addEventListener(LOGIN_REQUIRED_EVENT, onLoginRequired);
    return () => window.removeEventListener(LOGIN_REQUIRED_EVENT, onLoginRequired);
  }, [router, pathname]);

  // Intercept write triggers (links, buttons) for logged-out visitors before
  // any form/modal opens, and send them to login with an explanation.
  useEffect(() => {
    if (user) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const trigger = target?.closest?.("[data-requires-auth]");
      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      window.dispatchEvent(new CustomEvent(LOGIN_REQUIRED_EVENT));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [user]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-offwhite text-sm text-ink/60">
        {t("loading")}
      </div>
    );
  }

  const items = NAV.filter((item) => isManager || isDemo || !item.managerOnly);
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-charcoal text-white">
      <div className="border-b border-charcoal-soft px-5 py-5">
        <p className="font-display text-xl font-bold tracking-wide">
          MARQUE <span className="text-gold">ONE</span>
        </p>
        <p className="mt-1 text-xs text-white/50">
          {user ? `${isManager ? t("managerApp") : t("staffApp")} · ${user.full_name}` : t("demoView")}
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active(item.href)
                    ? "bg-gold text-charcoal"
                    : "text-white/80 hover:bg-charcoal-soft hover:text-white",
                )}
                aria-current={active(item.href) ? "page" : undefined}
              >
                {item.icon}
                {t(item.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-charcoal-soft p-4">
        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-charcoal-soft hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            {t("logout")}
          </button>
        ) : (
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg bg-gold px-3 py-2.5 text-sm font-semibold text-charcoal hover:bg-gold-dark hover:text-white"
          >
            <LogIn className="h-5 w-5" />
            {t("login")}
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-offwhite">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw]">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:ps-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-stone-line bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-charcoal hover:bg-offwhite lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <p className="font-display text-lg font-bold text-charcoal lg:hidden">
            MARQUE <span className="text-gold">ONE</span>
          </p>
          <div className="ms-auto flex items-center gap-2 sm:gap-3">
            <InstallAppButton />
            <LanguageToggle />
            {user ? (
              <>
                <span className="hidden rounded-full bg-gold-light px-3 py-1.5 text-xs font-semibold text-gold-dark sm:inline">
                  {user.role === "super_admin" ? "Manager" : user.role === "waiter" ? "Waiter" : "Staff"}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg p-2 text-charcoal hover:bg-offwhite lg:hidden"
                  aria-label={t("logout")}
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-charcoal hover:bg-gold-dark hover:text-white sm:px-4"
              >
                <LogIn className="h-4 w-4" />
                {t("login")}
              </Link>
            )}
          </div>
        </header>

        {isDemo && (
          <div
            className="border-b border-gold/40 bg-gold-light px-4 py-2 text-center text-sm font-semibold text-charcoal"
            role="status"
          >
            {t("demoViewBanner")}{" "}
            <Link href="/login" className="text-gold-dark underline underline-offset-2">
              {t("login")}
            </Link>
          </div>
        )}

        {USE_SAMPLE_DATA && (
          <div className="bg-amber-400 px-4 py-2 text-center text-sm font-bold text-charcoal" role="status">
            {t("sampleBanner")}
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>

        <footer className="border-t border-stone-line px-6 py-4 text-center text-xs text-ink/50">
          MARQUE ONE — Marriage Hall Management System
        </footer>
      </div>
    </div>
  );
}
