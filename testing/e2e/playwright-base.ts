/**
 * Playwright factory entry — specs import from `@/testing/e2e/playwright-base`
 * (see `e2e/tsconfig.json` paths → `../testing/*`; no `baseUrl`). Do not import
 * `@playwright/test` directly in specs.
 */
export { expect, test } from "@playwright/test";
