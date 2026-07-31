import { getBrowserAuthClient } from "./browser-runtime";
import { AUTH_PATHS } from "./path-capability";

export type {
	AfendaAuthViewPath,
	PreLoginPublicPath,
	PublicAuthPath,
	RejectedAuthPathAlias,
} from "./auth-paths";
export type { BrowserAuthClient } from "./browser-runtime";
export type { JoinInvitationQuery } from "./join-paths";
export type { PostLoginTarget } from "./post-login";
export type { Role } from "./role";

/** Permanent browser-safe capability. Shares path policy with `authServer`. */
export const authBrowser = Object.freeze({
	getClient: getBrowserAuthClient,
	paths: AUTH_PATHS,
});

export type AuthBrowserCapability = typeof authBrowser;
