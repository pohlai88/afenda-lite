import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

const files = [
	...fs.readdirSync(path.join(root, "store")).map((f) => path.join(root, "store", f)),
	...fs.readdirSync(path.join(root, "seed-db", "apps")).map((f) =>
		path.join(root, "seed-db", "apps", f),
	),
	...fs.readdirSync(path.join(root, "types", "apps")).map((f) =>
		path.join(root, "types", "apps", f),
	),
	path.join(root, "utils", "contact-utils.ts"),
	path.join(root, "configs", "mailConfig.ts"),
];

for (const file of files) {
	const text = fs.readFileSync(file, "utf8");
	const rel = path.relative(root, file).replaceAll("\\", "/");
	let next = text;

	if (rel.startsWith("store/")) {
		next = next
			.replaceAll("@/fake-db/apps/", "../seed-db/apps/")
			.replaceAll("@/types/apps/", "../types/apps/")
			.replaceAll("@/utils/", "../utils/")
			.replaceAll("@/assets/data/", "../assets/data/")
			.replaceAll("@/configs/", "../configs/");
	} else if (rel.startsWith("seed-db/apps/")) {
		next = next
			.replaceAll("@/types/apps/", "../../types/apps/")
			.replaceAll("@/configs/", "../../configs/");
	} else if (rel.startsWith("types/apps/")) {
		next = next.replaceAll("@/types/apps/", "./");
	} else if (rel === "utils/contact-utils.ts") {
		next = next.replaceAll("@/types/apps/", "../types/apps/");
	} else if (rel === "configs/mailConfig.ts") {
		next = next.replaceAll("@/types/apps/", "../types/apps/");
	}

	if (next !== text) {
		fs.writeFileSync(file, next);
		console.log("rewrote", rel);
	} else {
		console.log("unchanged", rel);
	}
}

fs.writeFileSync(
	path.join(root, "types", "apps", "calendar-types.ts"),
	[
		"/** Studio path parity — kit calendar types live in types/calendar. */",
		"export type {",
		"\tCalendarEvent,",
		"\tCalendarEventType,",
		"\tCalendarView,",
		"\tEventColor,",
		"\tevents,",
		"} from '../calendar';",
		"",
	].join("\n"),
);
console.log("wrote types/apps/calendar-types.ts");
