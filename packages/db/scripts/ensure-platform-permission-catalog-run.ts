/**
 * Invoked by ensure-platform-permission-catalog.mjs (N10).
 * Prints redacted catalog ensure summary — no connection strings.
 */
import { db } from "../src/client";
import { ensurePlatformPermissionCatalog } from "../src/platform-permission-catalog";

const result = await ensurePlatformPermissionCatalog(db);

console.log("@afenda/db db:ensure-permission-catalog OK");
console.log(`  permissionCount: ${result.permissionCount}`);
for (const template of result.templates) {
	console.log(
		`  template ${template.templateKey} → roleId=${template.roleId} created=${template.created}`,
	);
}
console.log(
	"  note: ARCH-023 v1 release seed — not drizzle 0000 baseline migrate",
);
