/**
 * Canonical Shadcn Studio design kit for the portal.
 *
 * One Studio language (base-nova @ss-blocks) → portal wrappers / Neon slots.
 * Do not ship Studio login forms as production auth — Neon AuthView owns credentials.
 *
 * Install: `npm run studio:install-block -- <block-slug>`
 * Authority: `lib/ui-decision-matrix.ts` + this kit.
 */

export type StudioKitRole =
  | "layout-reference"
  | "portal-pattern"
  | "chrome-reference"
  | "data-surface";

export type StudioKitEntry = {
  blockSlug: string;
  role: StudioKitRole;
  /** Path under components/shadcn-studio/blocks (or sibling). */
  localPath: string;
  /** Portal adoption surface — wrappers or Neon hosts. */
  portalAdoption: string;
  /** Surfaces in UI_SURFACE_REGISTRY that should follow this block. */
  surfaces: string[];
  notes: string;
};

/**
 * Single design language for page standardization.
 * Prefer these winners over alternate Studio variants of the same category.
 */
export const CANONICAL_STUDIO_KIT: readonly StudioKitEntry[] = [
  {
    blockSlug: "login-page-02",
    role: "layout-reference",
    localPath: "components/shadcn-studio/blocks/login-page-02/",
    portalAdoption:
      "Studio `LoginPage02Chrome` + `PortalAuthNeonView` (`features/auth`). Demo LoginForm removed.",
    surfaces: [
      "auth-sign-in",
      "auth-sign-up",
      "auth-forgot-password",
      "auth-reset-password",
      "shell-auth",
      "client-join",
    ],
    notes:
      "Two-column split + form column density. Social / magic-link / demo buttons stay unused while Neon ui.social is false.",
  },
  {
    blockSlug: "form-layout-01",
    role: "portal-pattern",
    localPath: "components/shadcn-studio/blocks/form-layout-01/",
    portalAdoption: "components/portal-form-section.tsx",
    surfaces: [
      "client-profile",
      "client-declare",
      "client-acknowledgement",
      "admin-create-declaration",
      "admin-issue-invite",
    ],
    notes: "Default single-section form chrome for client + admin forms.",
  },
  {
    blockSlug: "form-layout-02",
    role: "portal-pattern",
    localPath: "components/shadcn-studio/blocks/form-layout-02/",
    portalAdoption: "declaration-settings-section / multi-section settings",
    surfaces: ["admin-declaration-detail", "admin-access-share"],
    notes: "Multi-section settings; use when one form-layout-01 section is insufficient.",
  },
  {
    blockSlug: "form-layout-08",
    role: "portal-pattern",
    localPath: "components/shadcn-studio/blocks/form-layout-08/",
    portalAdoption: "components/declaration-form.tsx → form-layout-wizard-shell.tsx",
    surfaces: ["client-declare"],
    notes: "Wizard shell for multi-step declaration.",
  },
  {
    blockSlug: "empty-state-01",
    role: "portal-pattern",
    localPath: "components/shadcn-studio/blocks/empty-state-01/",
    portalAdoption:
      "components/portal-empty-state.tsx (PortalEmptyStateCard) + portal-route-error",
    surfaces: [
      "client-declare-receipt",
      "client-preview-unavailable",
      "error-route",
      "error-boundary-client",
      "error-boundary-dashboard",
    ],
    notes: "Dashed icon + title + description card. Prefer portal wrappers over raw Studio demo.",
  },
  {
    blockSlug: "empty-state-02",
    role: "portal-pattern",
    localPath: "components/portal-empty-state-cta.tsx",
    portalAdoption: "components/portal-empty-state-cta.tsx",
    surfaces: ["client-declare-empty"],
    notes: "CTA empty state — wrapper only until Studio block install if needed.",
  },
  {
    blockSlug: "account-settings-01",
    role: "chrome-reference",
    localPath: "components/shadcn-studio/blocks/account-settings-01/",
    portalAdoption:
      "PortalNeonAccountView chrome only. Keep Neon AccountView for email/password; strip social URL / connect-account unless product asks.",
    surfaces: ["account-settings", "account-security", "client-profile"],
    notes: "Section separators + personal-info density inform profile/account layout.",
  },
  {
    blockSlug: "datatable-component-01",
    role: "data-surface",
    localPath: "components/shadcn-studio/blocks/datatable-transaction.tsx",
    portalAdoption: "org-declarations-table.tsx",
    surfaces: ["admin-dashboard"],
    notes: "Already installed.",
  },
  {
    blockSlug: "datatable-component-04",
    role: "data-surface",
    localPath: "components/shadcn-studio/blocks/datatable-user.tsx",
    portalAdoption: "portal-client-tables.tsx",
    surfaces: ["admin-clients"],
    notes: "Already installed.",
  },
  {
    blockSlug: "statistics-component-03",
    role: "data-surface",
    localPath: "components/shadcn-studio/blocks/statistics-card-03.tsx",
    portalAdoption: "portal-statistics-card.tsx",
    surfaces: ["client-dashboard", "admin-dashboard", "admin-declaration-detail"],
    notes: "Already installed.",
  },
] as const;

export function getCanonicalStudioEntry(
  blockSlug: string,
): StudioKitEntry | undefined {
  return CANONICAL_STUDIO_KIT.find((entry) => entry.blockSlug === blockSlug);
}

export function listCanonicalBlocksByRole(
  role: StudioKitRole,
): readonly StudioKitEntry[] {
  return CANONICAL_STUDIO_KIT.filter((entry) => entry.role === role);
}
