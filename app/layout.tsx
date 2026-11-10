import type { Metadata } from "next";
import { Inter, Noto_Nastaliq_Urdu, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { AppShell } from "@/components/layout";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  variable: "--font-urdu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MARQUE ONE — Marriage Hall Management System",
  description:
    "MARQUE ONE marriage hall management: bookings, calendar, customers, payments, tables, employees and attendance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${nastaliq.variable}`}>
      <body>
        <LanguageProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
