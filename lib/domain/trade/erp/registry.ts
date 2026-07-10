import "server-only";

import { createHttpRestErpAdapter } from "@/lib/domain/trade/erp/http-rest/adapter";
import { noopErpAdapter } from "@/lib/domain/trade/erp/generic-noop";
import type { ErpAdapter } from "@/lib/domain/trade/erp/types";
import { isRegisteredErpVendor } from "@/lib/domain/trade/erp/vendors";
import type { ServerEnv } from "@/lib/env/schema";
import {
  getHotSalesErpApiKey,
  getHotSalesErpBaseUrl,
  getHotSalesErpVendor,
  isHotSalesErpSyncEnabled,
} from "@/lib/env/accessors";
import { getServerEnv } from "@/lib/env/server";

type ResolveErpAdapterEnv = Pick<
  ServerEnv,
  "HOT_SALES_ERP_SYNC_ENABLED" | "HOT_SALES_ERP_VENDOR" | "HOT_SALES_ERP_BASE_URL"
>;

type ResolveErpAdapterOptions = {
  env?: ResolveErpAdapterEnv;
  apiKey?: string;
};

/** Resolve ERP adapter from env (ADR-004). Default noop until vendor pack configured. */
export function resolveErpAdapter(
  options?: ResolveErpAdapterOptions,
): ErpAdapter {
  const env = options?.env ?? getServerEnv();
  if (!isHotSalesErpSyncEnabled(env)) return noopErpAdapter;

  const vendor = getHotSalesErpVendor(env);
  if (!isRegisteredErpVendor(vendor)) return noopErpAdapter;

  if (vendor === "http-rest") {
    return createHttpRestErpAdapter({
      baseUrl: getHotSalesErpBaseUrl(env) ?? "",
      apiKey: options?.apiKey ?? getHotSalesErpApiKey(),
    });
  }

  return noopErpAdapter;
}
