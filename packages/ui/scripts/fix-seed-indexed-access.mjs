import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

const kanbanPath = path.join(root, "seed-db", "apps", "kanban.ts");
let kanban = fs.readFileSync(kanbanPath, "utf8");
if (!kanban.includes("requireAt")) {
	kanban = kanban.replace(
		"import type { Assignee, Task } from '../../types/apps/kanban-types'",
		"import type { Assignee, Task } from '../../types/apps/kanban-types'\nimport { requireAt } from '../require-at'",
	);
}
kanban = kanban.replace(
	/teamMembers\[(\d+)\]/g,
	"requireAt(teamMembers, $1, 'teamMember')",
);
fs.writeFileSync(kanbanPath, kanban);

const usersPath = path.join(root, "seed-db", "apps", "users.ts");
let users = fs.readFileSync(usersPath, "utf8");
if (!users.includes("requireAt")) {
	users = users.replace(
		"import type { AppUser } from '../../types/apps/user-types'",
		"import type { AppUser } from '../../types/apps/user-types'\nimport { requireAt } from '../require-at'",
	);
}
users = users.replace(/browsers\[([^\]]+)\]/g, "requireAt(browsers, $1, 'browser')");
users = users.replace(/devices\[([^\]]+)\]/g, "requireAt(devices, $1, 'device')");
fs.writeFileSync(usersPath, users);

console.log("seed indexed access fixed");
