"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ClearHighlightQueryProps = {
  keys: string[];
  delayMs?: number;
};

export function ClearHighlightQuery({ keys, delayMs = 4000 }: ClearHighlightQueryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasTrackedKey = keys.some((key) => searchParams.has(key));
    if (!hasTrackedKey) return;

    const timer = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams.toString());
      let changed = false;

      for (const key of keys) {
        if (nextParams.has(key)) {
          nextParams.delete(key);
          changed = true;
        }
      }

      if (!changed) return;

      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs, keys, pathname, router, searchParams]);

  return null;
}
