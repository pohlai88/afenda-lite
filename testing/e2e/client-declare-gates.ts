import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, type Page } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/portal-copy";
import { clientDeclareHref } from "@/lib/portal-routes";

function runPortalStateScript(args: string[]) {
  const output = execFileSync(
    process.execPath,
    ["--env-file=.env", resolve("scripts/e2e-client-portal-state.mjs"), ...args],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`e2e-client-portal-state did not return JSON:\n${output}`);
  }

  return JSON.parse(output.slice(start, end + 1)) as {
    success: boolean;
    assignmentId?: string;
    error?: string;
  };
}

export function getClientAssignmentIdForEmail(email: string) {
  const payload = runPortalStateScript(["assignment-id", email]);
  if (!payload.success || !payload.assignmentId) {
    throw new Error(
      payload.error ?? `No assignment found for ${email}`,
    );
  }
  return payload.assignmentId;
}

export function clearClientPortalAcknowledgement(email: string) {
  runPortalStateScript(["set-ack", email, "cleared"]);
}

export function restoreClientPortalAcknowledgement(email: string) {
  runPortalStateScript(["set-ack", email, "seeded"]);
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
