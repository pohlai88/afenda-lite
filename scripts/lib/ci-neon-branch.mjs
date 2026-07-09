/** Dedicated Neon branch for GitHub Actions localhost Playwright (S17 Option 1). */
export const CI_NEON_BRANCH = {
  name: "ci",
  branchId: "br-noisy-field-ao7og20e",
  projectId: "young-hat-54755363",
  projectName: "iam-check",
  orgId: "org-royal-bar-40022480",
  authBaseUrl:
    "https://ep-royal-silence-ao4j5bqp.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth",
  authHostFragment: "ep-royal-silence-ao4j5bqp",
};

export async function fetchCiBranchDatabaseUrl(apiKey) {
  const url = `https://console.neon.tech/api/v2/projects/${CI_NEON_BRANCH.projectId}/connection_uri?branch_id=${CI_NEON_BRANCH.branchId}&database_name=neondb&role_name=neondb_owner&pooled=true`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Neon connection_uri failed (${response.status})`);
  }
  const payload = await response.json();
  const uri = payload?.uri;
  if (!uri) {
    throw new Error("Neon connection_uri response missing uri");
  }
  return uri;
}
