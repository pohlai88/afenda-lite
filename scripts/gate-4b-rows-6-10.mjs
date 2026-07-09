/**
 * One-off Gate 4B matrix rows 6–10 against PLAYWRIGHT_BASE_URL (default production).
 * Usage: npm run env:compose && node scripts/gate-4b-rows-6-10.mjs
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
    /* CI injects env */
  }
}

loadEnv();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://iam-check.vercel.app";
const email = process.env.E2E_CLIENT_EMAIL ?? process.env.PREVIEW_CLIENT_EMAIL;
const password =
  process.env.E2E_CLIENT_PASSWORD ??
  process.env.CLIENT_DEFAULT_PASSWORD ??
  process.env.PREVIEW_CLIENT_PASSWORD;

const eventId =
  process.env.GATE_4B_EVENT_ID ?? "cf9ee45a-c6f9-414f-87f0-ee005f2e3216";
const productId =
  process.env.GATE_4B_PRODUCT_ID ?? "e4e61554-9d41-495c-8d5c-9f217ed0f47d";

if (!email || !password) {
  console.error("Missing PREVIEW_CLIENT_* or E2E_CLIENT_* credentials");
  process.exit(1);
}

const results = [];

function record(row, pass, detail) {
  results.push({ row, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`Row ${row}: ${mark} — ${detail}`);
}

async function login(page) {
  await page.goto(`${baseURL}/auth/sign-in`);
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^(sign in|login)$/i }).click();
  await page.waitForURL(
    (url) => !url.pathname.includes("/auth/sign-in"),
    { timeout: 30_000 },
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`Base URL: ${baseURL}`);
  console.log(`Sales account domain: ${email.split("@")[1]}`);

  await login(page);

  // Row 6
  await page.goto(`${baseURL}/trade/vi/events`);
  await page.waitForLoadState("networkidle");
  const row6Url = page.url();
  const row6Pass =
    row6Url.includes("/trade/vi/events") && !row6Url.includes("/client");
  record(
    6,
    row6Pass,
    row6Pass
      ? `Landed on trade events (${row6Url})`
      : `Unexpected URL: ${row6Url}`,
  );

  // Row 7
  const stamp = Date.now();
  const customer = `Gate4B Matrix ${stamp}`;
  await page.goto(`${baseURL}/trade/vi/events/${eventId}/order`);
  await page.waitForLoadState("domcontentloaded");
  const orderUrl = page.url();
  if (!orderUrl.includes("/order")) {
    record(7, false, `Could not reach order form: ${orderUrl}`);
  } else {
    await page.getByLabel(/customer name/i).fill(customer);
    await page.locator("#productId").selectOption(productId);
    await page.getByLabel(/requested quantity/i).fill("5");
    await page.getByRole("button", { name: /submit order/i }).click();
    try {
      await page.waitForURL(/\/my-orders/, { timeout: 25_000 });
      const body = await page.content();
      const row7Pass = body.includes(customer);
      record(
        7,
        row7Pass,
        row7Pass
          ? `Order submitted; redirected to my-orders with ${customer}`
          : "Redirected to my-orders but customer row not visible",
      );
    } catch (error) {
      record(7, false, `Submit did not reach my-orders: ${page.url()}`);
    }
  }

  // Row 8
  await page.goto(`${baseURL}/trade/vi/my-orders`);
  await page.waitForLoadState("networkidle");
  const row8Body = await page.content();
  const row8Pass = row8Body.includes(customer);
  record(
    8,
    row8Pass,
    row8Pass
      ? `Own order visible for ${customer}`
      : `Order not listed on my-orders (${page.url()})`,
  );

  // Row 9
  await page.goto(`${baseURL}/trade/vi/admin/events`);
  await page.waitForLoadState("networkidle");
  const row9Url = page.url();
  const row9Pass =
    !row9Url.includes("/admin/events") ||
    row9Url.endsWith("/trade/vi/events") ||
    row9Url.includes("/trade/vi/events");
  record(
    9,
    row9Pass,
    row9Pass
      ? `Non-admin denied/redirected (${row9Url})`
      : `Sales reached admin events: ${row9Url}`,
  );

  // Row 10 — server-side guards (RSC page + server action RPC)
  const row10PageResponse = await page.goto(
    `${baseURL}/trade/vi/admin/events/new`,
    { waitUntil: "commit" },
  );
  await page.waitForLoadState("networkidle");
  const row10Url = page.url();
  const row10PagePass =
    !row10Url.includes("/admin/events/new") &&
    row10Url.includes("/trade/vi/events");

  let row10ActionPass = false;
  let row10ActionDetail = "action probe skipped";

  // Resolve Next-Action id from an admin session (same deploy build), then replay as sales.
  const adminEmail = process.env.E2E_OPERATOR_EMAIL ?? process.env.SHARED_ADMIN_EMAIL;
  const adminPassword =
    process.env.E2E_OPERATOR_PASSWORD ?? process.env.SHARED_ADMIN_PASSWORD;

  if (row10PagePass && adminEmail && adminPassword) {
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    let actionId = null;

    adminPage.on("request", (request) => {
      const header = request.headers()["next-action"];
      if (header && request.method() === "POST") {
        actionId = header;
      }
    });

    await adminPage.goto(`${baseURL}/auth/sign-in`);
    await adminPage.getByLabel(/^email$/i).fill(adminEmail);
    await adminPage.getByLabel(/^password$/i).fill(adminPassword);
    await adminPage.getByRole("button", { name: /^(sign in|login)$/i }).click();
    await adminPage.waitForURL(
      (url) => !url.pathname.includes("/auth/sign-in"),
      { timeout: 30_000 },
    );
    await adminPage.goto(`${baseURL}/trade/vi/admin/events/new`);
    await adminPage.waitForLoadState("networkidle");

    const opens = new Date(Date.now() - 60_000);
    const closes = new Date(Date.now() + 60 * 60_000);
    const pad = (n) => String(n).padStart(2, "0");
    const toLocal = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    await adminPage.getByLabel(/event name/i).fill(`Gate4B Action Id Probe ${stamp}`);
    await adminPage.locator("#opensAt").fill(toLocal(opens));
    await adminPage.locator("#closesAt").fill(toLocal(closes));
    await adminPage.getByRole("button", { name: /create event/i }).click();
    await adminPage.waitForTimeout(3_000);

    if (!actionId) {
      row10ActionDetail = "could not capture Next-Action id from admin submit";
    } else {
      const cookies = await context.cookies();
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
      const boundary = `----gate4b${stamp}`;
      const probeName = `Gate4B Action Probe ${stamp}`;
      const body = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="1_eventName"`,
        "",
        probeName,
        `--${boundary}`,
        `Content-Disposition: form-data; name="1_opensAt"`,
        "",
        toLocal(opens),
        `--${boundary}`,
        `Content-Disposition: form-data; name="1_closesAt"`,
        "",
        toLocal(closes),
        `--${boundary}`,
        `Content-Disposition: form-data; name="1_timezone"`,
        "",
        "Asia/Ho_Chi_Minh",
        `--${boundary}`,
        `Content-Disposition: form-data; name="1_eventType"`,
        "",
        "hot_sales",
        `--${boundary}`,
        `Content-Disposition: form-data; name="0"`,
        "",
        '["vi"]',
        `--${boundary}--`,
        "",
      ].join("\r\n");

      const actionResponse = await fetch(
        `${baseURL}/trade/vi/admin/events/new`,
        {
          method: "POST",
          headers: {
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            Cookie: cookieHeader,
            "Next-Action": actionId,
            Accept: "text/x-component",
          },
          body,
          redirect: "manual",
        },
      );

      const actionStatus = actionResponse.status;
      const actionText = await actionResponse.text();
      const location = actionResponse.headers.get("location") ?? "";
      const blocked =
        actionStatus === 303 ||
        actionStatus === 302 ||
        actionStatus === 307 ||
        location.includes("/trade/vi/events") ||
        /NEXT_REDIRECT|trade\/vi\/events/i.test(actionText) ||
        /"error"/i.test(actionText);
      const created = /eventId|event\.created|"ok":true/i.test(actionText);

      row10ActionPass = blocked && !created;
      row10ActionDetail = `createTradeEventAction replay as sales: status=${actionStatus}, location=${location || "none"}, blocked=${blocked}, created=${created}`;
    }

    await adminContext.close();
  } else if (!adminEmail || !adminPassword) {
    row10ActionDetail = "admin creds missing — page guard only";
    row10ActionPass = row10PagePass;
  }

  const row10Pass = row10PagePass && row10ActionPass;
  record(
    10,
    row10Pass,
    [
      row10PagePass
        ? `RSC guard redirected (${row10PageResponse?.status() ?? "?"} → ${row10Url})`
        : `RSC guard failed (${row10Url})`,
      row10ActionDetail,
    ].join("; "),
  );

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log("\n--- Gate 4B rows 6–10 summary ---");
  for (const r of results) {
    console.log(`  ${r.row}: ${r.pass ? "PASS" : "FAIL"}`);
  }
  console.log(
    `\nGate 4B matrix rows 6–10: ${failed.length === 0 ? "PASS" : "FAIL"} (${results.length - failed.length}/${results.length})`,
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
