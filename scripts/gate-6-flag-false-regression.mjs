/**
 * Gate 6 flag=false regression (minimal). Ops harness — not committed.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* injected env */
  }
}

loadEnv();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://iam-check.vercel.app";
const salesEmail = process.env.E2E_CLIENT_EMAIL ?? process.env.PREVIEW_CLIENT_EMAIL;
const salesPassword =
  process.env.E2E_CLIENT_PASSWORD ??
  process.env.CLIENT_DEFAULT_PASSWORD ??
  process.env.PREVIEW_CLIENT_PASSWORD;
const adminEmail = process.env.E2E_OPERATOR_EMAIL ?? process.env.SHARED_ADMIN_EMAIL;
const adminPassword =
  process.env.E2E_OPERATOR_PASSWORD ?? process.env.SHARED_ADMIN_PASSWORD;
const nonOwnerOrderId =
  process.env.GATE6_NON_OWNER_ORDER_ID ?? "87706b49-7ed9-4398-ae6c-ef0c9fe02284";

if (!salesEmail || !salesPassword) {
  console.error("Missing sales credentials");
  process.exit(1);
}

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}: ${detail}`);
};

async function login(page, email, password) {
  await page.goto(`${baseURL}/auth/sign-in`);
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^(sign in|login)$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/sign-in"), {
    timeout: 30_000,
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  let transferActionId = null;

  page.on("request", (request) => {
    const header = request.headers()["next-action"];
    if (header && request.method() === "POST") transferActionId = header;
  });

  console.log(`Base URL: ${baseURL}`);
  console.log(`Commit: 51e9a5b · HOT_SALES_RBAC_ENABLED=false`);

  await login(page, salesEmail, salesPassword);

  await page.goto(`${baseURL}/trade/vi/events`);
  await page.waitForLoadState("networkidle");
  const eventsUrl = page.url();
  record(
    "sales /trade/vi/events",
    eventsUrl.includes("/trade/vi/events") && !eventsUrl.includes("/client"),
    eventsUrl,
  );

  await page.goto(`${baseURL}/trade/vi/my-orders`);
  await page.waitForLoadState("networkidle");
  const transferBtn = page.getByRole("button", { name: /request transfer/i }).first();
  if (!(await transferBtn.isVisible().catch(() => false))) {
    record(
      "sales own transfer",
      false,
      "Transfer form not visible — reset order transfer_status to none first",
    );
  } else {
    const stamp = Date.now();
    await page.getByPlaceholder("New customer name").first().fill(`Transfer Own ${stamp}`);
    await page.getByPlaceholder("Reason").first().fill("Gate6 flag=false regression");
    await transferBtn.click();
    await page.waitForTimeout(6_000);
    const body = await page.content();
    const ok =
      body.includes("Transfer pending approval") ||
      body.includes("transfer pending approval");
    record(
      "sales own transfer",
      ok,
      ok ? "Pending approval shown after submit" : "No pending state in page HTML",
    );
  }

  if (!transferActionId) {
    record("sales non-owner transfer", false, "No Next-Action id captured");
  } else {
    const cookies = await context.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const boundary = `----gate6${Date.now()}`;
    const body = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="1_newCustomerName"`,
      "",
      "Blocked Customer",
      `--${boundary}`,
      `Content-Disposition: form-data; name="1_newCustomerCode"`,
      "",
      "",
      `--${boundary}`,
      `Content-Disposition: form-data; name="1_transferQuantity"`,
      "",
      "1",
      `--${boundary}`,
      `Content-Disposition: form-data; name="1_reason"`,
      "",
      "non-owner probe",
      `--${boundary}`,
      `Content-Disposition: form-data; name="0"`,
      "",
      `["vi","${nonOwnerOrderId}"]`,
      `--${boundary}--`,
      "",
    ].join("\r\n");

    const response = await fetch(`${baseURL}/trade/vi/my-orders`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Cookie: cookieHeader,
        "Next-Action": transferActionId,
        Accept: "text/x-component",
      },
      body,
      redirect: "manual",
    });
    const text = await response.text();
    const forbidden = /"error":"forbidden"/i.test(text) || /forbidden/i.test(text);
    const ok = /"ok":true/i.test(text);
    record(
      "sales non-owner transfer",
      forbidden && !ok,
      `status=${response.status}; forbidden=${forbidden}; ok=${ok}`,
    );
  }

  if (adminEmail && adminPassword) {
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, adminEmail, adminPassword);
    await adminPage.goto(`${baseURL}/trade/vi/my-orders`);
    await adminPage.waitForLoadState("networkidle");
    record(
      "admin transfer path",
      (await adminPage.url()).includes("/trade/vi/my-orders"),
      adminPage.url(),
    );
    await adminContext.close();
  }

  await browser.close();
  const failed = results.filter((r) => !r.pass);
  console.log(`\nFlag=false regression: ${failed.length === 0 ? "PASS" : "FAIL"} (${results.length - failed.length}/${results.length})`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
