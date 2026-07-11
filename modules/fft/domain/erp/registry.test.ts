import { describe, expect, it } from "vitest";
import { noopErpAdapter } from "@/modules/fft/domain/erp/generic-noop";
import { resolveErpAdapter } from "@/modules/fft/domain/erp/registry";
import { isRegisteredErpVendor } from "@/modules/fft/domain/erp/vendors";

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
        FFT_ERP_SYNC_ENABLED: "false",
        FFT_ERP_VENDOR: "http-rest",
        FFT_ERP_BASE_URL: "https://erp.example",
      },
    });
    expect(adapter.systemId).toBe(noopErpAdapter.systemId);
  });

  it("returns http-rest pack when vendor configured", () => {
    const adapter = resolveErpAdapter({
      env: {
        FFT_ERP_SYNC_ENABLED: "true",
        FFT_ERP_VENDOR: "http-rest",
        FFT_ERP_BASE_URL: "https://erp.example",
      },
    });
    expect(adapter.systemId).toBe("http-rest");
  });

  it("falls back to noop for unregistered vendor id", () => {
    const adapter = resolveErpAdapter({
      env: {
        FFT_ERP_SYNC_ENABLED: "true",
        FFT_ERP_VENDOR: "customer-acme",
        FFT_ERP_BASE_URL: "https://erp.example",
      },
    });
    expect(adapter.systemId).toBe(noopErpAdapter.systemId);
  });
});
