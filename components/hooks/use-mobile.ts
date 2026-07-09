"use client";

import { useEffect, useState } from "react";
import { MOBILE_MEDIA_QUERY } from "@/lib/breakpoints";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
    const onChange = () => {
      setIsMobile(mql.matches);
    };

    mql.addEventListener("change", onChange);
    onChange();

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return Boolean(isMobile);
}
