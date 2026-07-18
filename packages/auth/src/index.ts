import "server-only";

export type { AuthApiHandlers } from "./api-handler";
export {
	AUTH_BFF_CORRELATION_HEADER,
	createAuthApiHandlers,
	isTrustedAuthBffPost,
	redactAuthHeaderValue,
	resolveAuthBffCorrelationId,
} from "./api-handler";
export type {
	AfendaAuthViewPath,
	PreLoginPublicPath,
	PublicAuthPath,
	RejectedAuthPathAlias,
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
	AUTH_SIGN_UP_PATH,
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
export type { CredentialAuthResult } from "./credentials";
export {
	signInWithEmail,
	signOutSession,
	signUpWithEmail,
} from "./credentials";
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
export type { BuildJoinUrlInput, JoinInvitationQuery } from "./join-paths";
export {
	buildInviteJoinUrl,
	buildJoinUrl,
	JOIN_INVITATION_ID_MAX_LENGTH,
	JOIN_PATH,
	parseJoinInvitationQuery,
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
