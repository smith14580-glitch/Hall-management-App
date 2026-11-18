"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const MIN_VISIBLE_MS = 450;
const MAX_VISIBLE_MS = 1200;

export function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const startedAt = useRef<number | null>(null);
  const maxTimer = useRef<number | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = (event.target as HTMLElement | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href");
      if (
        !link ||
        !href ||
        !href.startsWith("/") ||
        href.startsWith("/#") ||
        href === pathname ||
        link.hasAttribute("download") ||
        link.getAttribute("target") === "_blank"
      ) {
        return;
      }
      startedAt.current = Date.now();
      setVisible(true);
      if (maxTimer.current) window.clearTimeout(maxTimer.current);
      maxTimer.current = window.setTimeout(() => {
        setVisible(false);
        startedAt.current = null;
      }, MAX_VISIBLE_MS);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (maxTimer.current) window.clearTimeout(maxTimer.current);
    };
  }, [pathname]);

  useEffect(() => {
    if (startedAt.current === null) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current));
    const timer = window.setTimeout(() => {
      setVisible(false);
      startedAt.current = null;
    }, wait);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-gold/15"
      role="progressbar"
      aria-label="Loading section"
    >
      <span className="route-progress-bar block h-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" />
    </div>
  );
}
