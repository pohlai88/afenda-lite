import type { ReactNode } from "react";

export interface PortalAccessSlotProps {
  readonly children: ReactNode;
}

/**
 * Portal access slot.
 *
 * PA-P6 doctrine:
 * - Reserves the future auth chamber position only.
 * - Accepts children only.
 * - Does not import Neon Auth, AuthView, session providers, or form actions.
 * - Owns positioning and z-index, not credential behavior.
 */
export function PortalAccessSlot({ children }: PortalAccessSlotProps) {
  return (
    <aside
      className="portal-access-slot"
      data-portal-access-slot=""
      aria-label="Access chamber"
    >
      <div className="portal-access-slot__inner">{children}</div>
    </aside>
  );
}
