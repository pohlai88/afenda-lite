/**
 * Sidebar open-state cookie — shared by the client SidebarProvider (write)
 * and RSC shells (read → `defaultOpen`) so first paint matches the cookie.
 * No `"use client"` — safe to import from Server Components.
 */
export const SIDEBAR_COOKIE_NAME = "sidebar_state";

/** Seven days — matches client `document.cookie` max-age. */
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
