export type OperatorCreds = { email: string; password: string };

export function getOperatorCreds(): OperatorCreds | null {
  const email =
    process.env.E2E_OPERATOR_EMAIL ?? process.env.SHARED_ADMIN_EMAIL;
  const password =
    process.env.E2E_OPERATOR_PASSWORD ?? process.env.SHARED_ADMIN_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export function requireOperatorCreds(): OperatorCreds {
  const creds = getOperatorCreds();
  if (!creds) {
    throw new Error(operatorSkipMessage);
  }
  return creds;
}

export const operatorSkipMessage =
  "Set SHARED_ADMIN_* or E2E_OPERATOR_* env vars for operator E2E";

export type ClientCreds = { email: string; password: string };

export function getClientCreds(): ClientCreds | null {
  const email =
    process.env.E2E_CLIENT_EMAIL ?? process.env.PREVIEW_CLIENT_EMAIL;
  const password =
    process.env.E2E_CLIENT_PASSWORD ??
    process.env.CLIENT_DEFAULT_PASSWORD ??
    process.env.PREVIEW_CLIENT_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export function requireClientCreds(): ClientCreds {
  const creds = getClientCreds();
  if (!creds) {
    throw new Error(clientSkipMessage);
  }
  return creds;
}

export const clientSkipMessage =
  "Set PREVIEW_CLIENT_* or E2E_CLIENT_* env vars for client E2E";

export function getClientDefaultPasswordFromEnv() {
  return (
    process.env.CLIENT_DEFAULT_PASSWORD ??
    process.env.E2E_CLIENT_PASSWORD ??
    process.env.PREVIEW_CLIENT_PASSWORD ??
    null
  );
}

export function createE2eClientEmail(label = "onboard") {
  const stamp = Date.now();
  const localPart = `e2e-${label}-${stamp}`;
  const domain =
    process.env.E2E_CLIENT_EMAIL_DOMAIN ??
    process.env.PREVIEW_CLIENT_EMAIL?.split("@")[1] ??
    "iam-check.com";
  return `${localPart}@${domain}`;
}
