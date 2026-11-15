"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { demoActive, fetchSettings, updateSetting } from "./api";

const STORAGE_KEY = "marque-one-settings";

export const DEFAULT_SETTINGS: Record<string, string> = {
  hall_day_price: "150000",
  hall_night_price: "300000",
  default_advance_percent: "50",
  duty_start_time: "09:00",
  late_grace_minutes: "15",
  slot_day_start: "12:00",
  slot_day_end: "16:00",
  slot_night_start: "19:00",
  slot_night_end: "23:00",
  app_name: "MARQUE ONE",
};

function readLocal(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeLocal(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function mergeSettings(remote: Record<string, string> = {}): Record<string, string> {
  return { ...DEFAULT_SETTINGS, ...remote, ...readLocal() };
}

export interface SettingsContextValue {
  settings: Record<string, string>;
  loaded: boolean;
  getValue: (key: string, fallback?: string) => string;
  getNumber: (key: string, fallback?: number) => number;
  saveSettings: (
    updates: Record<string, string>,
    options?: { syncRemote?: boolean },
  ) => Promise<Record<string, string>>;
  refresh: (options?: { syncRemote?: boolean }) => Promise<Record<string, string>>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>(() => mergeSettings());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async (options?: { syncRemote?: boolean }) => {
    const syncRemote = options?.syncRemote ?? true;
    // Defer state updates so an effect calling refresh() never sets state
    // synchronously during the same render pass.
    await Promise.resolve();
    if (!syncRemote || demoActive()) {
      const merged = mergeSettings();
      setSettings(merged);
      setLoaded(true);
      return merged;
    }
    try {
      const rows = await fetchSettings();
      const remote: Record<string, string> = {};
      rows.forEach((r) => {
        remote[r.key] = String(r.value ?? "");
      });
      const merged = mergeSettings(remote);
      setSettings(merged);
      setLoaded(true);
      return merged;
    } catch {
      const merged = mergeSettings();
      setSettings(merged);
      setLoaded(true);
      return merged;
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const getValue = useCallback(
    (key: string, fallback?: string) => settings[key] ?? fallback ?? DEFAULT_SETTINGS[key] ?? "",
    [settings],
  );

  const getNumber = useCallback(
    (key: string, fallback = 0) => {
      const v = settings[key] ?? DEFAULT_SETTINGS[key];
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    },
    [settings],
  );

  const saveSettings = useCallback(
    async (updates: Record<string, string>, options?: { syncRemote?: boolean }) => {
      const previous = settings;
      const nextLocal = { ...previous, ...updates };
      const syncRemote = options?.syncRemote ?? true;

      // optimistic apply so all pages re-render immediately
      setSettings(nextLocal);
      writeLocal({ ...readLocal(), ...updates });

      if (!syncRemote || demoActive()) {
        return nextLocal;
      }

      const changed = Object.entries(updates).filter(([k, v]) => String(previous[k] ?? "") !== String(v));
      try {
        for (const [key, value] of changed) {
          await updateSetting(key, String(value));
        }
        const confirmed = await refresh({ syncRemote: true });
        return confirmed;
      } catch (err) {
        setSettings(previous);
        writeLocal(previous);
        throw err;
      }
    },
    [refresh, settings],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loaded, getValue, getNumber, saveSettings, refresh }),
    [getNumber, getValue, loaded, refresh, saveSettings, settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("Settings context not found. Use SettingsProvider.");
  return ctx;
}