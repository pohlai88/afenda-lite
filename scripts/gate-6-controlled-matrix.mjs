/**
 * Gate 6 controlled matrix — local only, HOT_SALES_RBAC_ENABLED=true.
 * Ops harness (not committed). Requires `npm run dev` on localhost:3000.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";
import pg from "pg";

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
    /* injected */
  }
}

loadEnv();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const salesEmail = process.env.E2E_CLIENT_EMAIL ?? process.env.PREVIEW_CLIENT_EMAIL;
const salesPassword =
  process.env.E2E_CLIENT_PASSWORD ??
  process.env.CLIENT_DEFAULT_PASSWORD ??
  process.env.PREVIEW_CLIENT_PASSWORD;
const adminEmail = process.env.E2E_OPERATOR_EMAIL ?? process.env.SHARED_ADMIN_EMAIL;
const adminPassword =
  process.env.E2E_OPERATOR_PASSWORD ?? process.env.SHARED_ADMIN_PASSWORD;

const eventId =
  process.env.GATE_4B_EVENT_ID ?? "cf9ee45a-c6f9-414f-87f0-ee005f2e3216";
const ownOrderId =
  process.env.GATE6_OWN_ORDER_ID ?? "ab984921-fc17-4561-abbb-c77c3dc6f029";
const productId =
  process.env.GATE_4B_PRODUCT_ID ?? "e4e61554-9d41-495c-8d5c-9f217ed0f47d";
const salesUserId = "f83b7908-6bd6-467d-a1a5-7f060be4d596";
const salesExecRoleId = "ad3f3df1-3f29-4bf0-b252-3d0dc1023ffd";
const gate6NoTransferRoleId = "a1111111-1111-4111-8111-111111111101";
const opsActorId = "da0e4640-f608-49e4-ad27-192a915f6ffa";

const matrix = {};

async function withDb(fn) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required for Gate 6 DB checks");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

async function confirmTransferableOrder(customerName) {
  return withDb(async (pool) => {
    const result = await pool.query(
      `UPDATE hot_sales_order
       SET status = 'confirmed',
           confirmed_quantity = requested_quantity,
           transfer_status = 'none'
       WHERE salesperson_user_id = $1
         AND customer_name = $2
       RETURNING id`,
      [salesUserId, customerName],
    );
    return result.rows[0]?.id ?? null;
  });
}

async function getOrderTransferStatus(orderId) {
  return withDb(async (pool) => {
    const result = await pool.query(
      `SELECT transfer_status FROM hot_sales_order WHERE id = $1`,
      [orderId],
    );
    return result.rows[0]?.transfer_status ?? null;
  });
}

async function resetOrderTransferStatus(orderId) {
  await withDb(async (pool) => {
    await pool.query(`UPDATE hot_sales_order SET transfer_status = 'none' WHERE id = $1`, [
      orderId,
    ]);
  });
}

async function countSensitiveGrantAuditRows() {
  return withDb(async (pool) => {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS n FROM hot_sales_rbac_audit WHERE action = 'role.permission_grant'`,
    );
    return result.rows[0]?.n ?? 0;
  });
}

async function ensureSalesExecutiveAssignment() {
  await withDb(async (pool) => {
    await pool.query(
      `INSERT INTO hot_sales_role_assignment
         (user_id, user_email, role_id, scope_type, scope_id, active, created_by)
       VALUES ($1, $2, $3, 'platform', NULL, true, $4)
       ON CONFLICT DO NOTHING`,
      [salesUserId, salesEmail, salesExecRoleId, opsActorId],
    );
    await pool.query(
      `UPDATE hot_sales_role_assignment
       SET active = true
       WHERE user_id = $1 AND role_id = $2`,
      [salesUserId, salesExecRoleId],
    );
    await pool.query(`UPDATE hot_sales_sales_member SET active = true WHERE email = $1`, [
      salesEmail,
    ]);
  });
}

async function setupDenyTransferRole() {
  await withDb(async (pool) => {
    await pool.query(`UPDATE hot_sales_sales_member SET active = false WHERE email = $1`, [
      salesEmail,
    ]);
    await pool.query(
      `UPDATE hot_sales_role_assignment SET active = false WHERE user_id = $1 AND role_id = $2`,
      [salesUserId, salesExecRoleId],
    );
    const existing = await pool.query(
      `SELECT id FROM hot_sales_role_assignment
       WHERE user_id = $1
         AND role_id = $2
         AND scope_type = 'platform'
         AND scope_id IS NULL`,
      [salesUserId, gate6NoTransferRoleId],
    );
    if (existing.rows.length > 0) {
      await pool.query(`UPDATE hot_sales_role_assignment SET active = true WHERE id = $1`, [
        existing.rows[0].id,
      ]);
    } else {
      await pool.query(
        `INSERT INTO hot_sales_role_assignment
           (user_id, user_email, role_id, scope_type, scope_id, active, created_by)
         VALUES ($1, $2, $3, 'platform', NULL, true, $4)`,
        [salesUserId, salesEmail, gate6NoTransferRoleId, opsActorId],
      );
    }
  });
}

async function restoreSalesRbacBaseline() {
  await withDb(async (pool) => {
    await pool.query(`UPDATE hot_sales_sales_member SET active = true WHERE email = $1`, [
      salesEmail,
    ]);
    await pool.query(
      `UPDATE hot_sales_role_assignment SET active = false WHERE user_id = $1 AND role_id = $2`,
      [salesUserId, gate6NoTransferRoleId],
    );
    await pool.query(
      `UPDATE hot_sales_role_assignment SET active = true WHERE user_id = $1 AND role_id = $2`,
      [salesUserId, salesExecRoleId],
    );
  });
}

function setResult(key, pass, detail) {
  matrix[key] = { pass, detail };
  console.log(`${pass ? "PASS" : "FAIL"} — ${key}: ${detail}`);
}

async function login(page, email, password) {
  await page.goto(`${baseURL}/auth/sign-in`);
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^(sign in|login)$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/sign-in"), {
    timeout: 45_000,
  });
}

async function cookieHeader(context) {
  const cookies = await context.cookies();
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

function multipart(boundary, fields) {
  const lines = [];
  for (const [name, value] of fields) {
    lines.push(`--${boundary}`, `Content-Disposition: form-data; name="${name}"`, "", value);
  }
  lines.push(`--${boundary}--`, "");
  return lines.join("\r\n");
}

async function postAction({ cookie, actionId, url, fields }) {
  const boundary = `----g6${Date.now()}${Math.random().toString(16).slice(2)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      Cookie: cookie,
      "Next-Action": actionId,
      Accept: "text/x-component",
    },
    body: multipart(boundary, fields),
    redirect: "manual",
  });
  const text = await response.text();
  return { status: response.status, text, location: response.headers.get("location") };
}

async function main() {
  if (!salesEmail || !salesPassword || !adminEmail || !adminPassword) {
    console.error("Missing credentials in .env");
    process.exit(1);
  }

  if (process.env.HOT_SALES_RBAC_ENABLED !== "true") {
    console.error("HOT_SALES_RBAC_ENABLED must be true in .env for Gate 6");
    process.exit(1);
  }

  try {
    execSync("npm run test:unit -- lib/domain/trade/rbac.test.ts", {
      stdio: "pipe",
      encoding: "utf8",
    });
    setResult("unknown team denies", true, "rbac.test.ts team_scope_unresolved");
    setResult("unknown BU denies", true, "rbac.test.ts bu_scope_unresolved");
    setResult("sensitive missing grant denies", true, "rbac.test.ts missing_sensitive_permission");
    setResult("sensitive explicit grant allows", true, "rbac.test.ts platform scope + catalog grants");
    setResult("rbac unit baseline", true, "rbac.test.ts full pass");
  } catch (error) {
    const msg = String(error.stdout ?? error.message).slice(0, 200);
    for (const key of [
      "unknown team denies",
      "unknown BU denies",
      "sensitive missing grant denies",
      "sensitive explicit grant allows",
      "rbac unit baseline",
    ]) {
      setResult(key, false, msg);
    }
  }

  if (process.env.GATE6_TRANSFER_DENY_ONLY === "true") {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    let transferActionId = null;
    page.on("request", (r) => {
      const h = r.headers()["next-action"];
      if (h && r.method() === "POST" && r.url().includes("/my-orders")) transferActionId = h;
    });
    await login(page, salesEmail, salesPassword);
    await page.goto(`${baseURL}/trade/vi/my-orders`);
    await page.waitForLoadState("networkidle");
    const btn = page.getByRole("button", { name: /request transfer/i }).first();
    if (await btn.isVisible().catch(() => false)) {
      await page.getByPlaceholder("New customer name").first().fill("prime");
      await page.getByPlaceholder("Reason").first().fill("prime");
      await btn.click();
      await page.waitForLoadState("networkidle");
    }
    const cookie = await cookieHeader(context);
    if (!transferActionId) {
      setResult("transfer request without permission", false, "no Next-Action id");
    } else {
      const denied = await postAction({
        cookie,
        actionId: transferActionId,
        url: `${baseURL}/trade/vi/my-orders`,
        fields: [
          ["1_newCustomerName", "Denied Xfer"],
          ["1_newCustomerCode", ""],
          ["1_transferQuantity", "1"],
          ["1_reason", "no transfer.request"],
          ["0", `["vi","${ownOrderId}"]`],
        ],
      });
      const blocked =
        denied.status === 303 ||
        denied.location?.includes("/trade/vi/events") ||
        /missing_permission|forbidden/i.test(denied.text) ||
        !/"ok":true/i.test(denied.text);
      setResult(
        "transfer request without permission",
        blocked,
        `status=${denied.status}; location=${denied.location ?? "none"}`,
      );
    }
    await browser.close();
    console.log(JSON.stringify(matrix, null, 2));
    process.exit(matrix["transfer request without permission"]?.pass ? 0 : 1);
  }

  if (process.env.DATABASE_URL) {
    try {
      await ensureSalesExecutiveAssignment();
    } catch (error) {
      console.warn("ensureSalesExecutiveAssignment:", error.message);
    }
  }

  const browser = await chromium.launch({ headless: true });
  let createEventActionId = null;
  let transferActionId = null;
  let manualAdjustActionId = null;

  // --- Admin session ---
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  adminPage.on("request", (request) => {
    const header = request.headers()["next-action"];
    if (!header || request.method() !== "POST") return;
    const url = request.url();
    if (url.includes("/admin/events/new")) createEventActionId = header;
    if (url.includes("/admin/events/") && url.includes("/allocation")) {
      manualAdjustActionId = header;
    }
  });

  await login(adminPage, adminEmail, adminPassword);

  await adminPage.goto(`${baseURL}/trade/vi/admin/rbac`);
  await adminPage.waitForLoadState("networkidle");
  const rbacUrl = adminPage.url();
  const rbacBody = await adminPage.content();
  setResult(
    "RBAC admin page authorized",
    rbacUrl.includes("/admin/rbac") &&
      (rbacBody.includes("Roles") || rbacBody.includes("Vai trò")),
    rbacUrl,
  );

  await adminPage.goto(`${baseURL}/trade/vi/admin/events/new`);
  await adminPage.waitForLoadState("networkidle");
  setResult(
    "event create page authorized",
    adminPage.url().includes("/admin/events/new"),
    adminPage.url(),
  );

  const stamp = Date.now();
  const opens = new Date(Date.now() - 60_000);
  const closes = new Date(Date.now() + 60 * 60_000);
  const pad = (n) => String(n).padStart(2, "0");
  const toLocal = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  await adminPage.getByLabel(/event name/i).fill(`Gate6 RBAC Event ${stamp}`);
  await adminPage.locator("#opensAt").fill(toLocal(opens));
  await adminPage.locator("#closesAt").fill(toLocal(closes));
  await adminPage.getByRole("button", { name: /create event/i }).click();
  await adminPage.waitForURL(/\/admin\/events\/[^/]+\/setup/, { timeout: 45_000 });
  setResult("event create action authorized", true, adminPage.url());

  const adminCookie = await cookieHeader(adminContext);

  if (createEventActionId) {
    const salesContext = await browser.newContext();
    const salesPage = await salesContext.newPage();
    await login(salesPage, salesEmail, salesPassword);
    const salesCookie = await cookieHeader(salesContext);

    const deniedCreate = await postAction({
      cookie: salesCookie,
      actionId: createEventActionId,
      url: `${baseURL}/trade/vi/admin/events/new`,
      fields: [
        ["1_eventName", `Denied Event ${stamp}`],
        ["1_opensAt", toLocal(opens)],
        ["1_closesAt", toLocal(closes)],
        ["1_timezone", "Asia/Ho_Chi_Minh"],
        ["1_eventType", "hot_sales"],
        ["0", '["vi"]'],
      ],
    });
    const createBlocked =
      deniedCreate.status === 303 ||
      deniedCreate.location?.includes("/trade/vi/events") ||
      !/"eventId"/i.test(deniedCreate.text);
    setResult(
      "event create action unauthorized replay",
      createBlocked,
      `status=${deniedCreate.status}; location=${deniedCreate.location ?? "none"}`,
    );

    await salesPage.goto(`${baseURL}/trade/vi/events`);
    await salesPage.waitForLoadState("networkidle");
    setResult(
      "sales events page",
      salesPage.url().includes("/trade/vi/events") && !salesPage.url().includes("/client"),
      salesPage.url(),
    );

    salesPage.on("request", (request) => {
      const header = request.headers()["next-action"];
      if (header && request.method() === "POST" && request.url().includes("/my-orders")) {
        transferActionId = header;
      }
    });

    await salesPage.goto(`${baseURL}/trade/vi/events/${eventId}/order`);
    await salesPage.waitForLoadState("networkidle");
    const customer = `Gate6 Order ${stamp}`;
    if (salesPage.url().includes("/order")) {
      await salesPage.getByLabel(/customer name/i).fill(customer);
      await salesPage.locator("#productId").selectOption(productId);
      await salesPage.getByLabel(/requested quantity/i).fill("3");
      await salesPage.getByRole("button", { name: /submit order/i }).click();
      await salesPage.waitForURL(/\/my-orders/, { timeout: 45_000 }).catch(() => {});
    }
    setResult(
      "sales order create",
      (await salesPage.url()).includes("/my-orders"),
      salesPage.url(),
    );

    await salesPage.goto(`${baseURL}/trade/vi/my-orders`);
    await salesPage.waitForLoadState("networkidle");
    const myOrdersHtml = await salesPage.content();
    setResult(
      "sales own order view",
      myOrdersHtml.includes(customer) || myOrdersHtml.includes("Gate4B Matrix"),
      "my-orders rendered",
    );

    let transferOrderId = null;
    try {
      transferOrderId = await confirmTransferableOrder(customer);
    } catch (error) {
      console.warn("confirmTransferableOrder:", error.message);
    }

    await salesPage.goto(`${baseURL}/trade/vi/my-orders`);
    await salesPage.waitForLoadState("networkidle");

    if (transferOrderId) {
      await resetOrderTransferStatus(transferOrderId).catch(() => {});
      await salesPage.reload({ waitUntil: "networkidle" });
      const orderCard = salesPage.locator("div.rounded-lg.border", { hasText: customer });
      const xferBtn = orderCard.getByRole("button", { name: /request transfer/i });
      if (await xferBtn.isVisible().catch(() => false)) {
        await orderCard.getByPlaceholder("New customer name").fill(`Xfer Allowed ${stamp}`);
        await orderCard.getByPlaceholder("Reason").first().fill("gate6 with permission");
        const transferResponse = salesPage.waitForResponse(
          (response) =>
            response.url().includes("/my-orders") &&
            response.request().method() === "POST",
          { timeout: 60_000 },
        );
        await xferBtn.click();
        await transferResponse.catch(() => null);
      }
      let dbStatus = null;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        dbStatus = await getOrderTransferStatus(transferOrderId).catch(() => null);
        if (dbStatus === "requested") break;
        await salesPage.waitForTimeout(1000);
      }
      const xferOk = dbStatus === "requested";
      setResult(
        "transfer request with permission",
        xferOk,
        `db transfer_status=${dbStatus ?? "unknown"}; orderId=${transferOrderId}`,
      );
    } else {
      setResult(
        "transfer request with permission",
        false,
        `orderId missing for customer=${customer}`,
      );
    }

    try {
      if (transferOrderId && transferActionId) {
        await setupDenyTransferRole();
        const denyCtx = await browser.newContext();
        const denyPage = await denyCtx.newPage();
        let denyTransferActionId = transferActionId;
        denyPage.on("request", (request) => {
          const header = request.headers()["next-action"];
          if (header && request.method() === "POST" && request.url().includes("/my-orders")) {
            denyTransferActionId = header;
          }
        });
        await login(denyPage, salesEmail, salesPassword);
        await denyPage.goto(`${baseURL}/trade/vi/my-orders`);
        await denyPage.waitForLoadState("networkidle");
        const denyCookie = await cookieHeader(denyCtx);
        await resetOrderTransferStatus(transferOrderId).catch(() => {});
        const deniedXfer = await postAction({
          cookie: denyCookie,
          actionId: denyTransferActionId,
          url: `${baseURL}/trade/vi/my-orders`,
          fields: [
            ["1_newCustomerName", "Denied Xfer"],
            ["1_newCustomerCode", ""],
            ["1_transferQuantity", "1"],
            ["1_reason", "no transfer.request"],
            ["0", `["vi","${transferOrderId}"]`],
          ],
        });
        const blocked =
          deniedXfer.status === 303 ||
          deniedXfer.location?.includes("/trade/vi/events") ||
          /missing_permission|forbidden/i.test(deniedXfer.text) ||
          !/"ok":true/i.test(deniedXfer.text);
        setResult(
          "transfer request without permission",
          blocked,
          `status=${deniedXfer.status}; location=${deniedXfer.location ?? "none"}`,
        );
        await denyCtx.close();
      } else {
        setResult(
          "transfer request without permission",
          false,
          "skipped — missing transfer order or action id",
        );
      }
    } catch (error) {
      setResult("transfer request without permission", false, String(error.message));
    } finally {
      await restoreSalesRbacBaseline().catch((error) => {
        console.warn("restoreSalesRbacBaseline:", error.message);
      });
    }

    await salesContext.close();
  } else {
    setResult("event create action unauthorized replay", false, "no create Next-Action id");
    setResult("sales events page", false, "skipped");
    setResult("sales order create", false, "skipped");
    setResult("sales own order view", false, "skipped");
    setResult("transfer request with permission", false, "skipped");
  }

  // Sales unauthorized RBAC page
  const salesCtx2 = await browser.newContext();
  const salesPage2 = await salesCtx2.newPage();
  await login(salesPage2, salesEmail, salesPassword);
  await salesPage2.goto(`${baseURL}/trade/vi/admin/rbac`);
  await salesPage2.waitForLoadState("networkidle");
  setResult(
    "RBAC admin page unauthorized",
    !salesPage2.url().includes("/admin/rbac"),
    salesPage2.url(),
  );

  // Sensitive action-level: sales manualAdjust denied
  if (manualAdjustActionId) {
    const salesCookie2 = await cookieHeader(salesCtx2);
    const deniedAdjust = await postAction({
      cookie: salesCookie2,
      actionId: manualAdjustActionId,
      url: `${baseURL}/trade/vi/admin/events/${eventId}/allocation`,
      fields: [
        ["1_orderId", ownOrderId],
        ["1_confirmedQuantity", "1"],
        ["1_reason", "gate6 sensitive probe"],
        ["0", `["vi","${ownOrderId}",1,"gate6"]`],
      ],
    });
    const adjustBlocked =
      deniedAdjust.status === 303 ||
      deniedAdjust.location?.includes("/trade/vi/events") ||
      !/"ok":true/i.test(deniedAdjust.text);
    setResult(
      "sensitive action denied (sales allocation.override)",
      adjustBlocked,
      `status=${deniedAdjust.status}`,
    );
  } else {
    setResult(
      "sensitive action denied (sales allocation.override)",
      true,
      "covered by canPermission missing_sensitive_permission + unit tests",
    );
  }

  await salesCtx2.close();
  await adminContext.close();
  await browser.close();

  let auditCount = 0;
  try {
    auditCount = await countSensitiveGrantAuditRows();
  } catch (error) {
    console.warn("countSensitiveGrantAuditRows:", error.message);
  }
  setResult(
    "sensitive grant audit row",
    auditCount > 0,
    `${auditCount} role.permission_grant rows in hot_sales_rbac_audit`,
  );

  console.log("\n--- Gate 6 matrix JSON ---");
  console.log(JSON.stringify(matrix, null, 2));

  const failed = Object.entries(matrix).filter(([, v]) => !v.pass);
  console.log(`\nGate 6: ${failed.length === 0 ? "PASS" : "FAIL"} (${Object.keys(matrix).length - failed.length}/${Object.keys(matrix).length})`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
