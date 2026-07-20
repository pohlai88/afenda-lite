import { getAuthBootstrap } from "@afenda/auth";

import { DevLoginFab } from "@/features/auth/dev-login-fab";
import {
	getLocalDevLoginAvailability,
	hasAnyLocalDevLogin,
	isLocalDevLoginRuntime,
} from "@/lib/local-dev-login";

/**
 * RSC host — mounts the floating local-dev login FAB when fixtures are configured
 * and the visitor is anonymous. Zero-cost outside local `next dev`.
 */
export async function DevLoginFabHost() {
	if (!isLocalDevLoginRuntime()) {
		return null;
	}

	const availability = getLocalDevLoginAvailability();
	if (!hasAnyLocalDevLogin(availability)) {
		return null;
	}

	const bootstrap = await getAuthBootstrap();
	if (bootstrap.state !== "anonymous") {
		return null;
	}

	return <DevLoginFab availability={availability} />;
}
