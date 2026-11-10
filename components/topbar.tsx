"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const NAV = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/bookings", key: "bookings" },
  { href: "/customers", key: "customers" },
  { href: "/payments", key: "payments" },
  { href: "/tables", key: "tables" },
  { href: "/employees", key: "employees" },
  { href: "/attendance", key: "attendance" },
  { href: "/reports", key: "reports" },
  { href: "/settings", key: "settings" },
];

export default function Topbar() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold tracking-tight">{t("app_name")}</span>
          </Link>
          <LanguageToggle />
        </div>
        <div className="hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                }`}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
            {t("logout")}
          </Button>
        </div>
      </div>
    </div>
  );
}
