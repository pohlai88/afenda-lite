import { surveys, withOrg } from "@afenda/db";

/**
 * Declarations — tenant survey list (ARCH-024 domain → `@afenda/db` withOrg).
 */
export async function listSurveys(orgId: string) {
  return withOrg(surveys, orgId);
}
