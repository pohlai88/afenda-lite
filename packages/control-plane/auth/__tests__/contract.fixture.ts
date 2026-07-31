import { authServer, type Role } from "@afenda/auth";
import { authBrowser } from "@afenda/auth/client";

const role: Role = "operator";

export const serverSession = authServer.session.get();
export const browserClient = authBrowser.getClient();
export const sharedLoginPath = authBrowser.paths.login;
export const roleCheck = authServer.roles.satisfies(role, "client");

// @ts-expect-error named runtime functions were deleted in the final cutover
authServer.getSession();

// @ts-expect-error the browser capability cannot access server sessions
authBrowser.session.get();

// @ts-expect-error historical role spellings are not construction values
export const historicalRole: Role = "owner";
