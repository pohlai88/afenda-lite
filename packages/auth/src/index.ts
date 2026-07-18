import "server-only";

export { createAuthApiHandlers } from "./api-handler";
export type {
	PreLoginPublicPath,
	PublicAuthPath,
} from "./auth-paths";
export {
	AFENDA_AUTH_VIEW_PATHS,
	AUTH_ACCEPT_INVITATION_PATH,
	AUTH_API_BASE_PATH,
	AUTH_BASE_PATH,
	AUTH_FORBIDDEN_PATH,
	AUTH_FORGOT_PASSWORD_PATH,
	AUTH_LOGIN_PATH,
	AUTH_RESET_PASSWORD_PATH,
	AUTH_SIGN_OUT_PATH,
	isPreLoginPublicPath,
	isPublicAuthPath,
	isRejectedAuthPathAlias,
	PRE_LOGIN_PUBLIC_PATHS,
	PUBLIC_AUTH_FULL_PATHS,
	PUBLIC_AUTH_PATHS,
	PUBLIC_LANDING_PATH,
	REJECTED_AUTH_PATH_ALIASES,
} from "./auth-paths";
export { resolveAuthUiOrigin } from "./auth-ui-origin";
export { signInWithEmail, signOutSession } from "./credentials";
export {
	buildEnsureActiveOrganizationUrl,
	ENSURE_ACTIVE_ORGANIZATION_PATH,
	handleEnsureActiveOrganizationRequest,
} from "./ensure-active-organization";
export { inviteOrgMember } from "./invitations";
export type { JoinInvitationQuery } from "./join-paths";
export {
	buildJoinUrl,
	JOIN_PATH,
	parseJoinInvitationQuery,
} from "./join-paths";
export type { OrgMember } from "./organization-members";
export { findOrgMember, listOrgMembers } from "./organization-members";
export {
	CLIENT_HOME_PATH,
	OPERATOR_HOME_PATH,
	POST_LOGIN_CALLBACK_PARAM,
	resolvePostLoginPath,
	resolveRoleHome,
	sanitizeCallbackUrl,
} from "./post-login";
export { createSessionProxy } from "./proxy";
export { requireRole } from "./rbac";
export type { Role } from "./role";
export {
	canInviteMember,
	inviteableRolesFor,
	roleSatisfies,
} from "./roles";
export type { ApiSession, Session } from "./session";
export { getApiSession, getAuthBootstrap, getSession } from "./session";
export {
	buildSyncSessionCookiesUrl,
	handleSyncSessionCookiesRequest,
	SYNC_SESSION_COOKIES_PATH,
} from "./sync-session-cookies";
