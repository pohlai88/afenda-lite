import type { ErpAdapter, ErpPushResult } from "@/lib/domain/trade/erp/types";

export type HttpRestErpAdapterConfig = {
  baseUrl: string;
  apiKey?: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

/** Reference ERP pack — wire customer endpoints per docs/hot-sales/integrations/. */
export function createHttpRestErpAdapter(
  config: HttpRestErpAdapterConfig,
): ErpAdapter {
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  return {
    systemId: "http-rest",
    async push(input): Promise<ErpPushResult> {
      if (!baseUrl) {
        return {
          ok: false,
          code: "erp_base_url_missing",
          message: "HOT_SALES_ERP_BASE_URL is not configured",
          retryable: false,
        };
      }

      try {
        const response = await fetch(`${baseUrl}/hot-sales/sync/${input.jobType}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
            "Idempotency-Key": input.idempotencyKey,
          },
          body: JSON.stringify({
            entityId: input.entityId,
            jobType: input.jobType,
            idempotencyKey: input.idempotencyKey,
          }),
        });

        if (response.status === 409) {
          return { ok: true, duplicate: true };
        }

        if (!response.ok) {
          const message = await response.text();
          return {
            ok: false,
            code: `http_${response.status}`,
            message: message.slice(0, 500) || response.statusText,
            retryable: response.status >= 500 || response.status === 429,
          };
        }

        const payload = (await response.json().catch(() => ({}))) as {
          externalId?: string;
          id?: string;
        };
        return {
          ok: true,
          externalId: payload.externalId ?? payload.id,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "network_error";
        return {
          ok: false,
          code: "network_error",
          message,
          retryable: true,
        };
      }
    },
  };
}
