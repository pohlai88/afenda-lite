import type { ErpAdapter, ErpPushResult } from "@/lib/domain/trade/erp/types";

/** Default adapter when sync disabled or no vendor pack configured. */
export const noopErpAdapter: ErpAdapter = {
  systemId: "generic-noop",
  async push(): Promise<ErpPushResult> {
    return { ok: true, duplicate: false };
  },
};
