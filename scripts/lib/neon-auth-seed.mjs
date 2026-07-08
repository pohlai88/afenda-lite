/**
 * Neon Auth helpers for seed/reset scripts (HTTP + optional SQL).
 */

function getAuthBaseUrl() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("NEON_AUTH_BASE_URL is required");
  }
  return baseUrl;
}

function getTrustedOrigin() {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  return appUrl || "http://localhost:3000";
}

function authRequestHeaders(extra = {}) {
  const origin = getTrustedOrigin();
  return {
    "Content-Type": "application/json",
    Origin: origin,
    Referer: `${origin}/`,
    ...extra,
  };
}

function extractCookieHeader(response) {
  if (typeof response.headers.getSetCookie === "function") {
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) {
      return cookies.map((entry) => entry.split(";")[0]).join("; ");
    }
  }

  const raw = response.headers.get("set-cookie");
  if (!raw) {
    return "";
  }

  return raw
    .split(/,(?=[^;]+(?:;|$))/g)
    .map((entry) => entry.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function readJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function findNeonAuthUser(pool, email) {
  const result = await pool.query(
    `SELECT id, email, name, role
     FROM neon_auth."user"
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
  );

  return result.rows[0] ?? null;
}

export async function setNeonAuthUserRole(pool, userId, role) {
  await pool.query(`UPDATE neon_auth."user" SET role = $2 WHERE id = $1`, [
    userId,
    role,
  ]);
}

export async function signUpEmail({ email, password, name }) {
  const response = await fetch(`${getAuthBaseUrl()}/sign-up/email`, {
    method: "POST",
    headers: authRequestHeaders(),
    body: JSON.stringify({ email, password, name }),
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(
      body?.message ??
        body?.error ??
        `Neon Auth sign-up failed (${response.status})`,
    );
  }

  return body;
}

export async function signInEmail({ email, password }) {
  const response = await fetch(`${getAuthBaseUrl()}/sign-in/email`, {
    method: "POST",
    headers: authRequestHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(
      body?.message ??
        body?.error ??
        `Neon Auth sign-in failed (${response.status})`,
    );
  }

  const cookie = extractCookieHeader(response);
  if (!cookie) {
    throw new Error("Neon Auth sign-in succeeded but no session cookie was returned");
  }

  return { cookie, body };
}

async function authJsonRequest(cookie, path, { method = "POST", body } = {}) {
  const response = await fetch(`${getAuthBaseUrl()}/${path}`, {
    method,
    headers: authRequestHeaders({ Cookie: cookie }),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const parsed = await readJson(response);
  if (!response.ok) {
    throw new Error(
      parsed?.message ??
        parsed?.error ??
        `Neon Auth ${path} failed (${response.status})`,
    );
  }

  return parsed;
}

function slugifyPortalOrg(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function getPortalOrganizationSlug() {
  const configured = process.env.PORTAL_ORG_SLUG?.trim();
  if (configured) {
    return slugifyPortalOrg(configured);
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (appUrl) {
    try {
      const hostname = new URL(appUrl).hostname;
      const label = hostname.split(".")[0];
      if (label && label !== "localhost") {
        return slugifyPortalOrg(label);
      }
    } catch {
      // fall through
    }
  }

  return slugifyPortalOrg(process.env.PORTAL_ORG_NAME?.trim() || "iam-check");
}

export async function ensurePortalOrganization({ cookie }) {
  const slug = getPortalOrganizationSlug();
  const name = process.env.PORTAL_ORG_NAME?.trim() || "iam-check";

  const list = await authJsonRequest(cookie, "organization/list", {
    method: "GET",
  });
  const organizations = list?.organizations ?? list?.data ?? list ?? [];

  const existing =
    organizations.find((organization) => organization.slug === slug) ??
    organizations[0];

  if (existing?.id) {
    await authJsonRequest(cookie, "organization/set-active", {
      body: { organizationId: existing.id },
    });
    console.log(`Using portal organization: ${existing.slug} (${existing.id})`);
    return existing;
  }

  const created = await authJsonRequest(cookie, "organization/create", {
    body: { name, slug },
  });
  const organization = created?.organization ?? created?.data ?? created;

  if (!organization?.id) {
    throw new Error("Neon Auth organization create did not return an id");
  }

  await authJsonRequest(cookie, "organization/set-active", {
    body: { organizationId: organization.id },
  });
  console.log(`Created portal organization: ${organization.slug} (${organization.id})`);
  return organization;
}

async function adminRequest(cookie, path, payload) {
  const response = await fetch(`${getAuthBaseUrl()}/${path}`, {
    method: "POST",
    headers: authRequestHeaders({ Cookie: cookie }),
    body: JSON.stringify(payload),
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(
      body?.message ??
        body?.error ??
        `Neon Auth admin/${path} failed (${response.status})`,
    );
  }

  return body;
}

export async function adminCreateUser(
  cookie,
  { email, password, name, role = "user", data },
) {
  return adminRequest(cookie, "admin/create-user", {
    email,
    password,
    name,
    role,
    ...(data ? { data } : {}),
  });
}

export async function adminSetUserPassword(cookie, { userId, newPassword }) {
  return adminRequest(cookie, "admin/set-user-password", {
    userId,
    newPassword,
  });
}

export async function adminUpdateUser(cookie, { userId, data }) {
  return adminRequest(cookie, "admin/update-user", { userId, data });
}

export async function adminRemoveUser(cookie, { userId }) {
  return adminRequest(cookie, "admin/remove-user", { userId });
}

export async function withAdminSession(adminEmail, adminPassword, fn) {
  const { cookie } = await signInEmail({
    email: adminEmail,
    password: adminPassword,
  });
  return fn(cookie);
}

export async function ensureNeonAdminUser({
  pool,
  email,
  password,
  name,
}) {
  const normalizedEmail = email.trim().toLowerCase();
  let user = await findNeonAuthUser(pool, normalizedEmail);

  if (!user) {
    await signUpEmail({ email: normalizedEmail, password, name });
    user = await findNeonAuthUser(pool, normalizedEmail);
    if (!user) {
      throw new Error(`Neon Auth user not found after sign-up: ${normalizedEmail}`);
    }
    await setNeonAuthUserRole(pool, user.id, "admin");
    console.log(`Created shared admin account for ${normalizedEmail}`);
    return user.id;
  }

  await withAdminSession(normalizedEmail, password, async (cookie) => {
    await adminSetUserPassword(cookie, { userId: user.id, newPassword: password });
  });
  await setNeonAuthUserRole(pool, user.id, "admin");
  console.log(`Updated shared admin account for ${normalizedEmail}`);
  return user.id;
}

export async function ensureNeonClientUser({
  pool,
  adminEmail,
  adminPassword,
  email,
  password,
  name,
}) {
  const normalizedEmail = email.trim().toLowerCase();
  let user = await findNeonAuthUser(pool, normalizedEmail);

  if (user) {
    await withAdminSession(adminEmail, adminPassword, async (cookie) => {
      await adminSetUserPassword(cookie, {
        userId: user.id,
        newPassword: password,
      });
    });
    console.log(`Updated Neon Auth client account for ${normalizedEmail}`);
    return user.id;
  }

  await withAdminSession(adminEmail, adminPassword, async (cookie) => {
    await adminCreateUser(cookie, {
      email: normalizedEmail,
      password,
      name,
      role: "user",
    });
  });

  user = await findNeonAuthUser(pool, normalizedEmail);
  if (!user) {
    throw new Error(`Neon Auth client user not found after create: ${normalizedEmail}`);
  }

  console.log(`Created Neon Auth client account for ${normalizedEmail}`);
  return user.id;
}

export async function purgeNeonAuthUsers({
  pool,
  adminEmail,
  adminPassword,
  preserveEmails,
}) {
  const preserved = new Set(
    [...preserveEmails].map((entry) => entry.trim().toLowerCase()).filter(Boolean),
  );

  const result = await pool.query(
    `SELECT id, email FROM neon_auth."user" ORDER BY email`,
  );

  let removed = 0;
  await withAdminSession(adminEmail, adminPassword, async (cookie) => {
    for (const row of result.rows) {
      const email = row.email?.trim().toLowerCase();
      if (!email || preserved.has(email)) {
        continue;
      }

      try {
        await adminRemoveUser(cookie, { userId: row.id });
        removed += 1;
        console.log(`Removed Neon Auth user: ${email}`);
      } catch (error) {
        console.warn(
          `Could not delete Neon Auth user ${email}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  });

  return removed;
}
