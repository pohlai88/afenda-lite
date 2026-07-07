export function isSupabaseDatabaseUrl(url) {
  try {
    return new URL(url).hostname.includes("supabase.com");
  } catch {
    return false;
  }
}

export function getPgPoolConfig(connectionString) {
  let connectionStringForPool = connectionString;

  if (isSupabaseDatabaseUrl(connectionString)) {
    try {
      const parsed = new URL(connectionString);
      parsed.searchParams.delete("sslmode");
      connectionStringForPool = parsed.toString();
    } catch {
      connectionStringForPool = connectionString;
    }
  }

  return {
    connectionString: connectionStringForPool,
    ssl: isSupabaseDatabaseUrl(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
  };
}
