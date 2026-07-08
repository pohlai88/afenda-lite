"use client";

import { useSyncExternalStore } from "react";

function subscribeToOrigin() {
  return () => {};
}

function getClientOrigin() {
  return window.location.origin;
}

function getServerOrigin() {
  return "";
}

/** Origin for Neon Auth UI email callbacks (password reset, OAuth). */
export function useNeonAuthUiBaseUrl() {
  return useSyncExternalStore(subscribeToOrigin, getClientOrigin, getServerOrigin);
}
