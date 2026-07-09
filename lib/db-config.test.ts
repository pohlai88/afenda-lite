import { describe, expect, it } from "vitest";
import {
  isPoolerConnection,
  isSupabaseDatabaseUrl,
  normalizeDatabaseUrl,
} from "@/lib/db-config";

describe("db-config", () => {
  const neonDirect =
    "postgresql://user:pass@ep-curly-sky-aojpc61y.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
  const neonPooler =
    "postgresql://user:pass@ep-curly-sky-aojpc61y-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
  const supabasePooler =
    "postgresql://user:pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

  it("detects Neon pooler hostnames", () => {
    expect(isPoolerConnection(neonPooler)).toBe(true);
    expect(isPoolerConnection(neonDirect)).toBe(false);
  });

  it("detects legacy Supabase pooler hostnames", () => {
    expect(isPoolerConnection(supabasePooler)).toBe(true);
    expect(isSupabaseDatabaseUrl(supabasePooler)).toBe(true);
    expect(isSupabaseDatabaseUrl(neonPooler)).toBe(false);
  });

  it("upgrades sslmode for Neon direct connections", () => {
    expect(normalizeDatabaseUrl(neonDirect)).toContain("sslmode=verify-full");
  });

  it("leaves legacy Supabase URLs unchanged", () => {
    expect(normalizeDatabaseUrl(supabasePooler)).toBe(supabasePooler);
  });
});
