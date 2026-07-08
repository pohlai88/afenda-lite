export function getAppBaseUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

export function getClientSignInUrl() {
  return `${getAppBaseUrl()}/client/login`;
}

export function getClientJoinUrl(invitationId?: string) {
  const base = `${getAppBaseUrl()}/join`;
  if (!invitationId?.trim()) {
    return base;
  }

  return `${base}?invitationId=${encodeURIComponent(invitationId.trim())}`;
}
