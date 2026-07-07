/**
 * Portal Playwright base — import from specs instead of `@playwright/test` directly.
 * Tag describe/test titles with `@smoke` or `@journey` for project grep.
 */
export { expect, test } from "@playwright/test";
export type { Page } from "@playwright/test";
