/** Tailwind `@theme --breakpoint-md` (48rem = 768px). */
export const BREAKPOINT_MD_REM = 48 as const;

export const BREAKPOINT_MD_PX = BREAKPOINT_MD_REM * 16;

/** Upper bound for sub-`md` layouts (matches Tailwind `max-md:`). */
export const MOBILE_MAX_WIDTH_PX = BREAKPOINT_MD_PX - 1;

export const MOBILE_MEDIA_QUERY =
  `(max-width: ${MOBILE_MAX_WIDTH_PX}px)` as const;
