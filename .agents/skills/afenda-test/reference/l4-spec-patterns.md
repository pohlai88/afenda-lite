# L4 spec patterns (Afenda)

## Registry-backed route loop

From `apps/developer/src/app/__tests__/route-lab-smoke.spec.ts`:

1. Read registry source or export a typed list from SSOT (`route-surface-registry.ts`).
2. For each route: `page.goto(href)`.
3. Assert heading, acceptance marker, landmarks.
4. Run `assertNoHorizontalOverflow` at desktop + mobile viewports.
5. Run `assertAccessibleInteractiveNames` and `assertImagesHaveAltText`.

## Test title tagging

```ts
test.describe("@smoke route lab surfaces", () => {
  for (const route of routeExpectations) {
    test(`@smoke ${route.href} renders ${route.heading}`, async ({ page }) => {
      await page.goto(route.href);
      await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
    });
  }
});
```

## Auth ingress markers

Prefer stable data attributes already on ingress shells:

- `data-auth-ingress-path`
- `data-auth-ingress-state`
- `data-auth-shell-block`
- `data-slot="auth-shell-title"`

## Options popout at L4

Only when L2 is insufficient (multi-page spine):

```ts
test("@smoke post-select round-trip @auth", async ({ page }) => {
  // 1. Authenticated storageState from @afenda/testing/e2e/erp-credentials
  // 2. goto workspace select → click membership option (role=button)
  // 3. waitForURL **/auth/complete**
  // 4. waitForURL destination (workspace or ?next=)
});
```

Membership option lists use **buttons**, not row-action ⋯ menus — use `getByRole("button", { name: /Acme/i })`.

## Imports

```ts
import { expect, test } from "@afenda/testing/e2e/playwright-base";
```

Do not import `@playwright/test` directly in app e2e folders.
