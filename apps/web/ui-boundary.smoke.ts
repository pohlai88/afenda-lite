/**
 * S5.1 boundary smoke — proves `@afenda/ui` resolves from the web workspace.
 * Full App Router layout lands in S7.1; styles: `styles/globals.css`.
 */
import { Button, buttonVariants, cn } from "@afenda/ui";

export const uiBoundary = { Button, buttonVariants, cn } as const;
