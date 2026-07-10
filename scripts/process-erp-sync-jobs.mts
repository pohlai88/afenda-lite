import { processPendingSyncJobs } from "../lib/domain/trade/erp-sync-store";

const result = await processPendingSyncJobs();
console.log(
  JSON.stringify({ ok: true, processed: result.processed, succeeded: result.succeeded }),
);
