"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, LogIn } from "lucide-react";
import { ApiError, isConnectionError, login as apiLogin, USE_SAMPLE_DATA } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { goldButtonClass, inputClass, labelClass } from "@/components/ui";

const schema = z.object({
  phone: z.string().min(10, "Phone number likhna zaroori hai (kam az kam 10 digits)."),
  password: z.string().min(1, "Password likhna zaroori hai."),
});

type FormValues = z.infer<typeof schema>;

const DEMO_PHONE = "03000000000";
const DEMO_PASSWORD = "demo1234";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Logged-in user opening /login goes to the dashboard (auth guard stays).
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const stored = typeof window !== "undefined" && window.localStorage.getItem("marqueone_access_token");
      const role = typeof window !== "undefined" ? window.localStorage.getItem("marqueone_user") : null;
      if (stored && role) router.replace("/");
    }, 0);
    return () => clearTimeout(timer);
  }, [router]);

  const onSubmit = async (values: FormValues) => {
    setError("");
    try {
      const user = await login(values.phone.trim(), values.password);
      router.replace(user.role === "super_admin" ? "/" : "/attendance");
    } catch (err) {
      if (isConnectionError(err)) {
        setError(
          "Backend se connect nahi ho raha — NEXT_PUBLIC_API_URL check karo. Backend (FastAPI) chal raha hai? / Cannot reach the backend — check NEXT_PUBLIC_API_URL. Is the backend (FastAPI) running?",
        );
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Login nahi ho saka — dobara try karo.");
      }
    }
  };

  // Sample mode only: open the dashboard with sample data — no login at all.
  const openDemo = async () => {
    setError("");
    try {
      await apiLogin(DEMO_PHONE, DEMO_PASSWORD);
      router.replace("/");
    } catch {
      setError("Demo mode OFF hai — demo dekhne ke liye NEXT_PUBLIC_USE_SAMPLE_DATA=true set karo.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="text-center">
          <p className="font-display text-3xl font-bold text-charcoal">
            MARQUE <span className="text-gold">ONE</span>
          </p>
          <p className="mt-2 text-sm text-ink/60">Marriage Hall Management System</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="phone" className={labelClass}>
              {t("phone")} Number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="03xx-xxxxxxx"
              className={inputClass}
              {...register("phone")}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClass}
              {...register("password")}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className={`${goldButtonClass} w-full`}>
            <LogIn className="h-4 w-4" />
            {isSubmitting ? t("loading") : t("login")}
          </button>
        </form>

        {USE_SAMPLE_DATA && (
          <button
            type="button"
            onClick={openDemo}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-stone-line bg-offwhite px-3 py-2.5 text-sm font-semibold text-charcoal hover:bg-stone-100"
          >
            <Eye className="h-4 w-4" />
            Demo dekhein — bina login ke
          </button>
        )}

        {USE_SAMPLE_DATA && (
          <p className="mt-4 rounded-lg bg-gold-light px-3 py-2 text-xs leading-relaxed text-gold-dark" role="note">
            Demo login (sample mode ON): phone <strong>{DEMO_PHONE}</strong>, password{" "}
            <strong>{DEMO_PASSWORD}</strong>
          </p>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-ink/50">
          Manager ya staff — apne phone number aur password se login karo.
          Account manager banata hai; yahan koi self-registration nahi hai.
        </p>
      </div>
    </div>
  );
}
