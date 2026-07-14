/**
 * S5.1 boundary smoke — proves `@afenda/ui` resolves from the web workspace.
 * App Router shell: `app/layout.tsx` + route groups (S7.2) + `styles/globals.css`.
 */
import { Button, buttonVariants, cn } from "@afenda/ui";

export const uiBoundary = { Button, buttonVariants, cn } as const;
