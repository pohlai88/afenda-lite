/** Keep in sync with lib/db-config.ts (Neon primary; Supabase legacy SSL/pooler rules). */
export function isSupabaseDatabaseUrl(url) {
  if (!url) return false;
  try {
    return new URL(url).hostname.includes("supabase.com");
  } catch {
    return false;
  }
}

export function normalizeDatabaseUrl(url) {
  if (!url || isSupabaseDatabaseUrl(url)) {
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

export function isPoolerConnection(url) {
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

export function getPgPoolConfig(connectionString) {
  const normalized = normalizeDatabaseUrl(connectionString);
  let connectionStringForPool = normalized;

  if (isSupabaseDatabaseUrl(normalized)) {
    try {
      const parsed = new URL(normalized);
      parsed.searchParams.delete("sslmode");
      connectionStringForPool = parsed.toString();
    } catch {
      connectionStringForPool = normalized;
    }
  }

  return {
    connectionString: connectionStringForPool,
    ssl: isSupabaseDatabaseUrl(normalized)
      ? { rejectUnauthorized: false }
      : undefined,
  };
}
