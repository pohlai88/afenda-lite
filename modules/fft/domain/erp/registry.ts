import "server-only";

import { createHttpRestErpAdapter } from "@/modules/fft/domain/erp/http-rest/adapter";
import { noopErpAdapter } from "@/modules/fft/domain/erp/generic-noop";
import type { ErpAdapter } from "@/modules/fft/domain/erp/types";
import { isRegisteredErpVendor } from "@/modules/fft/domain/erp/vendors";
import type { ServerEnv } from "@/modules/platform/env/schema";
import {
  getFftErpApiKey,
  getFftErpBaseUrl,
  getFftErpVendor,
  isFftErpSyncEnabled,
} from "@/modules/platform/env/accessors";
import { getServerEnv } from "@/modules/platform/env/server";

type ResolveErpAdapterEnv = Pick<
  ServerEnv,
  "FFT_ERP_SYNC_ENABLED" | "FFT_ERP_VENDOR" | "FFT_ERP_BASE_URL"
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
  if (!isFftErpSyncEnabled(env)) return noopErpAdapter;

  const vendor = getFftErpVendor(env);
  if (!isRegisteredErpVendor(vendor)) return noopErpAdapter;

  if (vendor === "http-rest") {
    return createHttpRestErpAdapter({
      baseUrl: getFftErpBaseUrl(env) ?? "",
      apiKey: options?.apiKey ?? getFftErpApiKey(),
    });
  }

  return noopErpAdapter;
}
