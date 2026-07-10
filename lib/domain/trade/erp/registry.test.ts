import { describe, expect, it } from "vitest";
import { noopErpAdapter } from "@/lib/domain/trade/erp/generic-noop";
import { resolveErpAdapter } from "@/lib/domain/trade/erp/registry";
import { isRegisteredErpVendor } from "@/lib/domain/trade/erp/vendors";

describe("isRegisteredErpVendor", () => {
  it("recognizes reference http-rest pack", () => {
    expect(isRegisteredErpVendor("http-rest")).toBe(true);
    expect(isRegisteredErpVendor("customer-acme")).toBe(false);
  });
});

describe("resolveErpAdapter", () => {
  it("returns noop when sync disabled", () => {
    const adapter = resolveErpAdapter({
      env: {
        HOT_SALES_ERP_SYNC_ENABLED: "false",
        HOT_SALES_ERP_VENDOR: "http-rest",
        HOT_SALES_ERP_BASE_URL: "https://erp.example",
      },
    });
    expect(adapter.systemId).toBe(noopErpAdapter.systemId);
  });

  it("returns http-rest pack when vendor configured", () => {
    const adapter = resolveErpAdapter({
      env: {
        HOT_SALES_ERP_SYNC_ENABLED: "true",
        HOT_SALES_ERP_VENDOR: "http-rest",
        HOT_SALES_ERP_BASE_URL: "https://erp.example",
      },
    });
    expect(adapter.systemId).toBe("http-rest");
  });

  it("falls back to noop for unregistered vendor id", () => {
    const adapter = resolveErpAdapter({
      env: {
        HOT_SALES_ERP_SYNC_ENABLED: "true",
        HOT_SALES_ERP_VENDOR: "customer-acme",
        HOT_SALES_ERP_BASE_URL: "https://erp.example",
      },
    });
    expect(adapter.systemId).toBe(noopErpAdapter.systemId);
  });
});
