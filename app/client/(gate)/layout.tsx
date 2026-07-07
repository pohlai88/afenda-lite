import type { ReactNode } from "react";

/** Gate routes (login, preview-unavailable) skip the client workspace shell. */
export default function ClientGateLayout({ children }: { children: ReactNode }) {
  return children;
}
