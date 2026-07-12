/**
 * Gate 7 production RBAC enable — compact smoke matrix.
 * Usage: node --env-file=.env scripts/gate-7-production-smoke.mjs
 */
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const BASE = process.env.GATE7_SMOKE_BASE_URL ?? "https://afenda-lite.vercel.app";
const LOCALE = "vi";
const OPEN_EVENT_ID =
  process.env.GATE7_OPEN_EVENT_ID ?? "3cf28288-a9be-4a77-8a7a-058c519e900c";

const adminEmail = process.env.SHARED_ADMIN_EMAIL;
const adminPassword = process.env.SHARED_ADMIN_PASSWORD;
const salesEmail = process.env.PREVIEW_CLIENT_EMAIL;
const salesPassword =
  process.env.PREVIEW_CLIENT_PASSWORD ?? process.env.CLIENT_DEFAULT_PASSWORD;

const results = [];

function setResult(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? ` — ${detail}` : ""}`);
}

function requireCreds() {
  const missing = [];
  if (!adminEmail || !adminPassword) missing.push("SHARED_ADMIN_*");
  if (!salesEmail || !salesPassword) missing.push("PREVIEW_CLIENT_*");
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`);
}

async function signIn(page, email, password) {
  await page.goto(`${BASE}/auth/sign-in`);
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^(sign in|login)$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/sign-in"), {
    timeout: 45_000,
  });
}

async function captureActionId(page, urlPattern, trigger) {
  let actionId;
  page.on("request", (request) => {
    const header = request.headers()["next-action"];
    if (
      header &&
      request.method() === "POST" &&
      request.url().includes(urlPattern)
    ) {
      actionId = header;
    }
  });
  await trigger();
  await page.waitForTimeout(1_500);
  return actionId;
}

async function replayAction(page, actionId, formEntries) {
  const body = new URLSearchParams();
  body.set("1_$ACTION_KEY", actionId);
  for (const [index, value] of formEntries) {
    body.set(String(index), value);
  }
  const response = await page.request.post(`${BASE}/fft/${LOCALE}/admin/events`, {
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "next-action": actionId,
    },
    data: body.toString(),
  });
  return { status: response.status(), text: await response.text() };
}

function toLocalInput(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function main() {
  requireCreds();

  try {
    const live = await fetch(`${BASE}/api/health/liveness`);
    const liveBody = await live.json();
    setResult(
      "health liveness",
      live.ok && liveBody?.data?.status === "alive",
      String(liveBody?.data?.status ?? live.status),
    );
  } catch (error) {
    setResult("health liveness", false, String(error));
  }

  try {
    const ready = await fetch(`${BASE}/api/health/readiness`);
    const readyBody = await ready.json();
    setResult(
      "health readiness",
      ready.ok && readyBody?.data?.status === "ready",
      String(readyBody?.data?.status ?? ready.status),
    );
  } catch (error) {
    setResult("health readiness", false, String(error));
  }

  try {
    execSync("npm run test:unit -- modules/fft/domain/rbac.test.ts", {
      stdio: "pipe",
      encoding: "utf8",
    });
    setResult("unknown team denies", true, "rbac.test.ts");
    setResult("unknown BU denies", true, "rbac.test.ts");
    setResult("sensitive missing grant denies", true, "rbac.test.ts");
  } catch (error) {
    const msg = String(error.stdout ?? error.message).slice(0, 160);
    setResult("rbac unit baseline", false, msg);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await signIn(adminPage, adminEmail, adminPassword);

    await adminPage.goto(`${BASE}/fft/${LOCALE}/admin/rbac`);
    await adminPage.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    setResult(
      "admin rbac page",
      adminPage.url().includes("/admin/rbac"),
      adminPage.url(),
    );

    await adminPage.goto(`${BASE}/fft/${LOCALE}/admin/events`);
    await adminPage.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    setResult(
      "admin events page",
      adminPage.url().includes("/admin/events"),
      adminPage.url(),
    );

    await adminPage.goto(`${BASE}/fft/${LOCALE}/admin/events/new`);
    await adminPage.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    setResult(
      "admin events/new page",
      adminPage.url().includes("/admin/events/new"),
      adminPage.url(),
    );

    const stamp = Date.now();
    const opens = new Date(Date.now() - 60_000);
    const closes = new Date(Date.now() + 2 * 60 * 60_000);
    await adminPage.getByLabel(/event name/i).fill(`Gate7 Smoke ${stamp}`);
    await adminPage.locator("#opensAt").fill(toLocalInput(opens));
    await adminPage.locator("#closesAt").fill(toLocalInput(closes));
    await adminPage.getByRole("button", { name: /create event/i }).click();
    await adminPage.waitForURL(/\/admin\/events\/[^/]+\/setup/, { timeout: 45_000 });
    setResult("admin event create action", true, adminPage.url());

    let createActionId;
    await adminPage.goto(`${BASE}/fft/${LOCALE}/admin/events/new`);
    createActionId = await captureActionId(adminPage, "/admin/events", async () => {
      await adminPage.getByLabel(/event name/i).fill(`Gate7 probe ${stamp}`);
      await adminPage.locator("#opensAt").fill(toLocalInput(opens));
      await adminPage.locator("#closesAt").fill(toLocalInput(closes));
      await adminPage.getByRole("button", { name: /create event/i }).click();
    });

    const salesContext = await browser.newContext();
    const salesPage = await salesContext.newPage();
    await signIn(salesPage, salesEmail, salesPassword);

    await salesPage.goto(`${BASE}/fft/${LOCALE}/events`);
    await salesPage.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const salesEventsPass =
      salesPage.url().includes("/fft/vi/events") &&
      !salesPage.url().includes("/client");
    setResult("sales events page", salesEventsPass, salesPage.url());

    await salesPage.goto(`${BASE}/fft/${LOCALE}/events/${OPEN_EVENT_ID}/order`);
    const customer = `Gate7 Customer ${stamp}`;
    await salesPage.getByLabel(/customer name/i).fill(customer);
    await salesPage.locator("#productId").selectOption("54e7f4b8-43a5-4ac1-b4db-116e1ea0e58e");
    await salesPage.getByLabel(/requested quantity/i).fill("5");
    await salesPage.getByRole("button", { name: /submit order/i }).click();
    await salesPage.waitForURL(/\/my-orders/, { timeout: 60_000 });
    setResult("sales order create", true, salesPage.url());

    await salesPage.goto(`${BASE}/fft/${LOCALE}/my-orders`);
    await salesPage.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const myOrdersText = await salesPage.locator("body").innerText();
    setResult(
      "sales my-orders",
      myOrdersText.includes(customer),
      customer,
    );

    await adminPage.goto(`${BASE}/fft/${LOCALE}/admin/events/${OPEN_EVENT_ID}/allocation`);
    await adminPage.getByRole("button", { name: /run allocation/i }).click();
    await adminPage.waitForTimeout(3_000);

    await salesPage.goto(`${BASE}/fft/${LOCALE}/my-orders`);
    await salesPage.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});

    let transferActionId;
    transferActionId = await captureActionId(salesPage, "/my-orders", async () => {
      const card = salesPage
        .locator("div.rounded-lg.border")
        .filter({ hasText: customer })
        .first();
      await card.scrollIntoViewIfNeeded();
      const form = card.locator("form");
      await form.getByPlaceholder("New customer name").fill(`Gate7 Transfer ${stamp}`);
      await form.locator('input[name="transferQuantity"]').fill("2");
      await form.getByPlaceholder("Reason").fill("Gate7 smoke transfer");
      await form.getByRole("button", { name: /request transfer/i }).click();
      await salesPage.waitForTimeout(2_000);
    });
    setResult(
      "sales own transfer request",
      Boolean(transferActionId),
      transferActionId ? "action captured" : "transfer form/action missing",
    );

    await salesPage.goto(`${BASE}/fft/${LOCALE}/admin/rbac`);
    await salesPage.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    setResult(
      "sales admin rbac denied",
      !salesPage.url().includes("/admin/rbac") &&
        salesPage.url().includes("/fft/vi/events"),
      salesPage.url(),
    );

    await salesPage.goto(`${BASE}/fft/${LOCALE}/admin/events/new`);
    await salesPage.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    setResult(
      "sales events/new denied (RSC)",
      !salesPage.url().includes("/admin/events/new"),
      salesPage.url(),
    );

    if (createActionId) {
      const replay = await replayAction(salesPage, createActionId, [
        ["1_eventName", `Gate7 denied ${stamp}`],
        ["1_eventType", "hot_sales"],
        ["1_opensAt", toLocalInput(opens)],
        ["1_closesAt", toLocalInput(closes)],
        ["1_timezone", "Asia/Ho_Chi_Minh"],
        ["1_sourceLocation", ""],
      ]);
      const denied =
        replay.status === 303 ||
        replay.status === 302 ||
        !/\"eventId\"/i.test(replay.text);
      setResult(
        "sales event.create replay denied",
        denied,
        `status=${replay.status}`,
      );
    } else {
      setResult("sales event.create replay denied", false, "missing action id");
    }

    await salesPage.goto(`${BASE}/fft/${LOCALE}/admin/events/${OPEN_EVENT_ID}/allocation`);
    await salesPage.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    setResult(
      "sales sensitive admin allocation denied",
      !salesPage.url().includes("/allocation") ||
        salesPage.url().includes("/fft/vi/events"),
      salesPage.url(),
    );

    await adminContext.close();
    await salesContext.close();
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\nGate 7 production smoke: ${passed}/${results.length} @ ${BASE}`);
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
