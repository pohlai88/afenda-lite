export function normalizeDatabaseUrl(url: string): string {
  if (isSupabaseDatabaseUrl(url)) {
    return url;
  }

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
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("pooler.supabase.com") ||
      parsed.port === "6543" ||
      parsed.hostname.includes("-pooler")
    );
  } catch {
    return false;
  }
}

export function isSupabaseDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    return hostname.includes("supabase.com");
  } catch {
    return false;
  }
}

export function getDatabaseSslOption(connectionString: string | undefined) {
  if (!connectionString || !isSupabaseDatabaseUrl(connectionString)) {
    return undefined;
  }

  return { rejectUnauthorized: false };
}

export function getDatabasePoolConfig(connectionString: string | undefined) {
  let connectionStringForPool = connectionString;

  if (connectionString && isSupabaseDatabaseUrl(connectionString)) {
    try {
      const parsed = new URL(connectionString);
      parsed.searchParams.delete("sslmode");
      connectionStringForPool = parsed.toString();
    } catch {
      connectionStringForPool = connectionString;
    }
  }

  const isVercelRuntime = Boolean(process.env.VERCEL);

  return {
    connectionString: connectionStringForPool,
    max: isVercelRuntime ? 5 : 10,
    idleTimeoutMillis: isVercelRuntime ? 10_000 : 30_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: isVercelRuntime,
    keepAlive: true,
    ssl: getDatabaseSslOption(connectionString),
  };
}
