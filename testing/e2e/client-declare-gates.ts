import { expect, type Page } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/copy/portal-copy";
import { clientDeclareHref } from "@/lib/routing/portal-routes";
import { runNodeScriptJson } from "@/testing/e2e/run-node-script";

export function getClientAssignmentIdForEmail(email: string) {
  const payload = runNodeScriptJson<{
    success: boolean;
    assignmentId?: string;
    error?: string;
  }>("scripts/e2e-client-portal-state.mjs", ["assignment-id", email]);
  if (!payload.success || !payload.assignmentId) {
    throw new Error(
      payload.error ?? `No assignment found for ${email}`,
    );
  }
  return payload.assignmentId;
}

export function clearClientPortalAcknowledgement(email: string) {
  runNodeScriptJson("scripts/e2e-client-portal-state.mjs", ["set-ack", email, "cleared"]);
}

export function restoreClientPortalAcknowledgement(email: string) {
  runNodeScriptJson("scripts/e2e-client-portal-state.mjs", ["set-ack", email, "seeded"]);
}

export async function expectClientDeclareNotFound(page: Page, assignmentId: string) {
  await page.goto(clientDeclareHref(assignmentId));
  await expect(
    page.getByRole("heading", { name: portalCopy.notFound.title }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page
      .getByRole("link", { name: portalCopy.notFound.backLabelClient })
      .or(page.getByRole("button", { name: portalCopy.notFound.backLabelClient })),
  ).toBeVisible();
}

export async function expectClientDeclareRedirectsHome(
  page: Page,
  assignmentId: string,
) {
  await page.goto(clientDeclareHref(assignmentId));
  await expect(page).toHaveURL(/\/client\/?$/, { timeout: 15_000 });
  await expect(
    page.getByText(portalCopy.clientDashboard.acknowledgement.gateNotice),
  ).toBeVisible();
}

export async function expectClientDeclareReceipt(page: Page) {
  await expect(page.getByText(/^CDP-/)).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText(portalCopy.clientDashboard.receiptDescription),
  ).toBeVisible();
}
