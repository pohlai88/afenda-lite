const productionUrl =
  process.env.PRODUCTION_URL?.replace(/\/$/, "") ??
  "https://iam-check.vercel.app";

const MAX_ATTEMPTS = 3;
const RETRY_MS = 2000;

async function fetchReadiness(endpoint) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        headers: { accept: "application/json" },
      });
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
      }
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  console.error(`Failed to reach ${endpoint}: ${message}`);
  process.exit(1);
}

async function main() {
  const endpoint = `${productionUrl}/api/health/readiness`;
  const response = await fetchReadiness(endpoint);

  if (!response.ok) {
    console.error(
      `Production readiness check failed: HTTP ${response.status} from ${endpoint}`,
    );
    process.exit(1);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    console.error("Production readiness check failed: response was not JSON");
    process.exit(1);
  }

  const status = body?.data?.status;
  if (status !== "ready") {
    const details = body?.data
      ? JSON.stringify({
          status: body.data.status,
          storage: body.data.storage,
          auth: body.data.auth,
        })
      : "missing data payload";
    console.error(
      `Production readiness check failed: expected data.status "ready", got ${details}`,
    );
    process.exit(1);
  }

  console.log(`Production readiness OK (${productionUrl})`);
}

main();
