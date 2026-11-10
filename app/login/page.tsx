"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { goldButtonClass, inputClass, labelClass } from "@/components/ui";

const schema = z.object({
  phone: z.string().min(10, "Phone number likhna zaroori hai (kam az kam 10 digits)."),
  password: z.string().min(1, "Password likhna zaroori hai."),
});

type FormValues = z.infer<typeof schema>;

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

  const onSubmit = async (values: FormValues) => {
    setError("");
    try {
      const user = await login(values.phone.trim(), values.password);
      router.replace(user.role === "super_admin" ? "/" : "/attendance");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Login nahi ho saka — dobara try karo.");
      }
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

        <p className="mt-6 text-center text-xs leading-relaxed text-ink/50">
          Manager ya staff — apne phone number aur password se login karo.
          Account manager banata hai; yahan koi self-registration nahi hai.
        </p>
      </div>
    </div>
  );
}
