"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { AppNotification } from "@/lib/types";

export function NotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(() => {
    if (!user) return;
    fetchUnreadNotificationCount().then(setUnread).catch(() => undefined);
  }, [user]);

  useEffect(() => {
    loadCount();
    const onFocus = () => loadCount();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadCount]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        setItems(await fetchNotifications());
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const onRead = async (n: AppNotification) => {
    if (n.is_read) return;
    try {
      await markNotificationRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      /* ignore */
    }
  };

  const onReadAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
      setUnread(0);
    } catch {
      /* ignore */
    }
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        className="relative rounded-lg p-2 text-charcoal hover:bg-offwhite"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-stone-line">
          <div className="flex items-center justify-between border-b border-stone-line px-4 py-3">
            <p className="font-display text-sm font-bold text-charcoal">Notifications</p>
            <button
              type="button"
              onClick={() => void onReadAll()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-ink/50">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink/50">No notifications.</p>
            ) : (
              <ul className="divide-y divide-stone-line">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void onRead(n)}
                      className={`block w-full px-4 py-3 text-start hover:bg-offwhite ${n.is_read ? "" : "bg-gold-light/40"}`}
                    >
                      <p className="text-sm font-semibold text-charcoal">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-ink/60">{n.body}</p>}
                      <p className="mt-1 text-[10px] text-ink/40">{formatDateTime(n.created_at)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
