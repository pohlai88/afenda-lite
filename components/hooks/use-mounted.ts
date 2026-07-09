"use client";

import { useEffect, useState } from "react";

/**
 * Returns false on SSR and the first client render, then true after mount.
 * Defer storage-, viewport-, or ID-sensitive UI until mounted to avoid hydration drift.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
