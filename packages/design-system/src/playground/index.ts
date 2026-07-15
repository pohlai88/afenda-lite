/**
 * The primitives door into `@afenda/ui` for product and harness code.
 *
 * Every export here must correspond to either `PLAYGROUND_PROVEN_EXPORTS`
 * or `PLAYGROUND_INFRA_EXPORTS` in `./types.ts`. Growing this file is the
 * literal "promotion" action — pair it with the matching allowlist update,
 * never alone.
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
export {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "../components/ui/accordion";
export { Button, buttonVariants } from "../components/ui/button";
export { Input } from "../components/ui/input";

// Infra allowlist — not tied to a registry lab, checked explicitly by
// packages/design-system/__tests__/architecture.test.ts.
export { cn } from "../lib/utils";
