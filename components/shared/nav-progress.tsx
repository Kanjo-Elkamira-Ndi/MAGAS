"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// Slim top-of-page progress bar shown for the whole duration of a page
// navigation — including dev-mode route compile time, which a route's own
// loading.tsx can't cover since nothing can stream until that route is
// compiled. Fires the instant a nav-triggering click happens, not once a
// response starts arriving, so a slow navigation never just looks frozen.

const NAV_START_EVENT = "magas:nav-start";

// For navigations that don't go through a real <a> the click listener can
// see (e.g. DataTable row clicks that call router.push programmatically).
export function startNavProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NAV_START_EVENT));
  }
}

function NavProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const safetyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function start() {
      setLoading(true);
      if (safetyTimeout.current) clearTimeout(safetyTimeout.current);
      // Never stay stuck if a navigation doesn't actually commit (hash-only
      // link, cancelled navigation, etc).
      safetyTimeout.current = setTimeout(() => setLoading(false), 15_000);
    }

    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      const here = window.location;
      if (url.origin !== here.origin) return;
      if (url.pathname === here.pathname && url.search === here.search) return;

      start();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener(NAV_START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAV_START_EVENT, start);
    };
  }, []);

  // Fires once the new route has actually committed — clears the bar
  // regardless of what caused the delay (compile, data fetch, network).
  useEffect(() => {
    setLoading(false);
    if (safetyTimeout.current) clearTimeout(safetyTimeout.current);
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 bg-primary transition-[width,opacity] ease-out",
        loading
          ? "w-[85%] opacity-100 duration-[8000ms]"
          : "w-full opacity-0 duration-300",
      )}
    />
  );
}

export function NavProgress() {
  // useSearchParams() requires a Suspense boundary so this doesn't force
  // every page in the tree into fully dynamic/client rendering.
  return (
    <Suspense fallback={null}>
      <NavProgressBar />
    </Suspense>
  );
}
