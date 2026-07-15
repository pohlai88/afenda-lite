/**
 * The primitives door into `@afenda/ui` for product and harness code.
 *
 * Every export here must correspond to either a `PlaygroundLab.exportName`
 * in `apps/web/features/playground/lab-registry.ts` (proven in a lab before
 * promotion) or the explicit infra allowlist below. Growing this file is
 * the literal "promotion" action — do it together with a matching registry
 * entry, never alone.
 *
 * `Providers` deliberately lives at `./playground/providers`, not here: its
 * dependency chain (settingsContext -> fonts.ts -> next/font/google +
 * geist/font/pixel) only executes inside Next.js's own bundler. Keeping it
 * out of this file means every other member here stays importable and
 * executable in a plain Node/Vitest environment.
 */

export { default as ActivityDialog } from "../components/shared/ActivityDialog";
export { default as NotificationDropdown } from "../components/shared/NotificationDropdown";
export { default as ProfileDropdown } from "../components/shared/ProfileDropdown";
export { Button, buttonVariants } from "../components/ui/button";

// Infra allowlist — not tied to a registry lab, checked explicitly by
// packages/design-system/__tests__/architecture.test.ts.
export { cn } from "../lib/utils";
