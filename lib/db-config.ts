export function normalizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const sslmode = parsed.searchParams.get("sslmode");
    if (
      sslmode === "prefer" ||
      sslmode === "require" ||
      sslmode === "verify-ca"
    ) {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function isPoolerConnection(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.includes("-pooler");
  } catch {
    return false;
  }
}

export function getDatabasePoolConfig(connectionString: string | undefined) {
  return {
    connectionString,
    max: process.env.VERCEL ? 5 : 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: true,
  };
}
