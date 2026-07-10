import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpRestErpAdapter } from "@/lib/domain/trade/erp/http-rest/adapter";

describe("createHttpRestErpAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns duplicate success on HTTP 409", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 409, text: async () => "" }),
    );

    const adapter = createHttpRestErpAdapter({ baseUrl: "https://erp.example" });
    const result = await adapter.push({
      jobType: "order",
      entityId: "ord-1",
      idempotencyKey: "sync:order:ord-1:v1",
    });

    expect(result).toEqual({ ok: true, duplicate: true });
  });

  it("maps success payload externalId", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ externalId: "ERP-99" }),
      }),
    );

    const adapter = createHttpRestErpAdapter({ baseUrl: "https://erp.example" });
    const result = await adapter.push({
      jobType: "order",
      entityId: "ord-1",
      idempotencyKey: "sync:order:ord-1:v1",
    });

    expect(result).toEqual({ ok: true, externalId: "ERP-99" });
  });
});
