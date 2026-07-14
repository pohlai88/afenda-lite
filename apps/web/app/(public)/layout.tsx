import type { ReactNode } from "react";

/** Public route group — no session gate. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return children;
}
