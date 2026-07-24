import {
	and,
	db,
	ensurePlatformPermissionCatalog,
	eq,
	isNull,
	platformRole,
} from "@afenda/db";
import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";

export const { hasDatabase } = resolveDatabaseUrlForTests();

export type SystemRoleTemplateKey = "org_admin" | "editor" | "viewer";

let fixturesPromise: Promise<void> | undefined;
const templateRoleIdPromises = new Map<SystemRoleTemplateKey, Promise<string>>();

/** Seeds ARCH-023 system role templates required by assign/revoke integration tests. */
export function ensureIdentityDatabaseFixtures(): Promise<void> {
	if (!hasDatabase) {
		return Promise.resolve();
	}
	fixturesPromise ??= ensurePlatformPermissionCatalog(db).then(() => undefined);
	return fixturesPromise;
}

/** Resolves live system template role ids after catalog seed (not fixed UUID literals). */
export function resolveSystemTemplateRoleId(
	templateKey: SystemRoleTemplateKey,
): Promise<string> {
	const cached = templateRoleIdPromises.get(templateKey);
	if (cached) {
		return cached;
	}

	const promise = (async () => {
		await ensureIdentityDatabaseFixtures();
		const [row] = await db
			.select({ id: platformRole.id })
			.from(platformRole)
			.where(
				and(
					eq(platformRole.templateKey, templateKey),
					eq(platformRole.isSystemTemplate, true),
					eq(platformRole.active, true),
					isNull(platformRole.organizationId),
				),
			)
			.limit(1);
		if (!row) {
			throw new Error(`Missing system template role: ${templateKey}`);
		}
		return row.id;
	})();

	templateRoleIdPromises.set(templateKey, promise);
	return promise;
}
