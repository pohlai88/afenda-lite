import "server-only";

import { createHttpRestErpAdapter } from "@/lib/domain/trade/erp/http-rest/adapter";
import { noopErpAdapter } from "@/lib/domain/trade/erp/generic-noop";
import type { ErpAdapter } from "@/lib/domain/trade/erp/types";
import {
  getHotSalesErpApiKey,
  getHotSalesErpBaseUrl,
  getHotSalesErpVendor,
  isHotSalesErpSyncEnabled,
} from "@/lib/env/accessors";

/** Resolve ERP adapter from env (ADR-004). Default noop until vendor pack configured. */
export function resolveErpAdapter(): ErpAdapter {
  if (!isHotSalesErpSyncEnabled()) return noopErpAdapter;

  const vendor = getHotSalesErpVendor();
  if (vendor === "http-rest") {
    return createHttpRestErpAdapter({
      baseUrl: getHotSalesErpBaseUrl() ?? "",
      apiKey: getHotSalesErpApiKey(),
    });
  }

  return noopErpAdapter;
}
