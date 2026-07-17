import "server-only";

export type { AuthApiHandlers } from "./api-handler";
export { createAuthApiHandlers } from "./api-handler";
export type { AfendaAuthViewPath, PublicAuthPath } from "./auth-paths";
export {
	AFENDA_AUTH_VIEW_PATHS,
	AUTH_API_BASE_PATH,
	AUTH_BASE_PATH,
	AUTH_FORBIDDEN_PATH,
	AUTH_LOGIN_PATH,
	isPublicAuthPath,
	PUBLIC_AUTH_PATHS,
} from "./auth-paths";
export { resolveAuthUiOrigin } from "./auth-ui-origin";
export {
	buildEnsureActiveOrganizationUrl,
	ENSURE_ACTIVE_ORGANIZATION_PATH,
	handleEnsureActiveOrganizationRequest,
} from "./ensure-active-organization";
export type {
	InviteOrgMemberInput,
	InviteOrgMemberResult,
} from "./invitations";
export { extractInvitationId, inviteOrgMember } from "./invitations";
export type { BuildJoinUrlInput } from "./join-paths";
export {
	buildInviteJoinUrl,
	buildJoinUrl,
	JOIN_PATH,
	requireAppOrigin,
} from "./join-paths";
export type { OrgMember } from "./organization-members";
export {
	findOrgMember,
	listOrgMembers,
	normalizeOrgMembers,
} from "./organization-members";
export type { MemberOrganization } from "./organization-membership";
export {
	normalizeMemberOrganizations,
	persistActiveOrganization,
	resolveMemberOrganizationId,
	selectResolvableOrganizationId,
} from "./organization-membership";
export type { PostLoginTarget } from "./post-login";
export {
	CLIENT_HOME_PATH,
	OPERATOR_HOME_PATH,
	POST_LOGIN_CALLBACK_PARAM,
	resolvePostLoginPath,
	resolveRoleHome,
	sanitizeCallbackUrl,
} from "./post-login";
export type { SessionProxy } from "./proxy";
export { createSessionProxy } from "./proxy";
export { requireRole } from "./rbac";
export type { Role } from "./role";
export type { NeonOrgRole } from "./roles";
export {
	canInviteMember,
	inviteableRolesFor,
	roleSatisfies,
	toNeonOrgRole,
	toSessionRole,
} from "./roles";
export type { ApiSession, AuthBootstrap, Session } from "./session";
export { getApiSession, getAuthBootstrap, getSession } from "./session";
export {
	buildSyncSessionCookiesUrl,
	handleSyncSessionCookiesRequest,
	SYNC_SESSION_COOKIES_PATH,
} from "./sync-session-cookies";
