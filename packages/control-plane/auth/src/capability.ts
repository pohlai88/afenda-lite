import { createAuthApiHandlers } from "./api-handler";
import { resolveAuthUiOrigin } from "./auth-ui-origin";
import { signInWithEmail, signOutSession } from "./credentials";
import {
	buildEnsureActiveOrganizationUrl,
	ENSURE_ACTIVE_ORGANIZATION_PATH,
	handleEnsureActiveOrganizationRequest,
} from "./ensure-active-organization";
import { inviteOrgMember } from "./invitations";
import { buildJoinUrl } from "./join-paths";
import {
	createOrganization,
	deleteOrganization,
	listMemberOrganizations,
	persistActiveOrganization,
} from "./organization-console";
import { findOrgMember, listOrgMembers } from "./organization-members";
import { AUTH_PATHS } from "./path-capability";
import { createSessionProxy } from "./proxy";
import { requireRole } from "./rbac";
import { canInviteMember, inviteableRolesFor, roleSatisfies } from "./roles";
import { getApiSession, getAuthBootstrap, getSession } from "./session";
import {
	buildSyncSessionCookiesUrl,
	handleSyncSessionCookiesRequest,
	SYNC_SESSION_COOKIES_PATH,
} from "./sync-session-cookies";

/** Permanent server-only capability for all application and package consumers. */
export const authServer = Object.freeze({
	api: Object.freeze({ createHandlers: createAuthApiHandlers }),
	credentials: Object.freeze({
		signInWithEmail,
		signOut: signOutSession,
	}),
	invitations: Object.freeze({
		buildJoinUrl,
		inviteMember: inviteOrgMember,
	}),
	members: Object.freeze({ find: findOrgMember, list: listOrgMembers }),
	organizations: Object.freeze({
		create: createOrganization,
		delete: deleteOrganization,
		list: listMemberOrganizations,
		persistActive: persistActiveOrganization,
	}),
	paths: AUTH_PATHS,
	proxy: Object.freeze({ create: createSessionProxy }),
	roles: Object.freeze({
		canInvite: canInviteMember,
		inviteableFor: inviteableRolesFor,
		satisfies: roleSatisfies,
	}),
	routes: Object.freeze({
		ensureActiveOrganization: Object.freeze({
			buildUrl: buildEnsureActiveOrganizationUrl,
			handle: handleEnsureActiveOrganizationRequest,
			path: ENSURE_ACTIVE_ORGANIZATION_PATH,
		}),
		syncSessionCookies: Object.freeze({
			buildUrl: buildSyncSessionCookiesUrl,
			handle: handleSyncSessionCookiesRequest,
			path: SYNC_SESSION_COOKIES_PATH,
		}),
	}),
	session: Object.freeze({
		bootstrap: getAuthBootstrap,
		get: getSession,
		getApi: getApiSession,
		requireRole,
	}),
	ui: Object.freeze({ resolveOrigin: resolveAuthUiOrigin }),
});

export type AuthServerCapability = typeof authServer;
