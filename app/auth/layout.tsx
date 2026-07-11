import type { ReactNode } from "react";
import "./neon-auth-ui.css";

/**
 * Auth segment layout — loads Neon Auth UI CSS only on `/auth/*`
 * so AdminCN operator chrome does not inherit Neon’s global sheet.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
