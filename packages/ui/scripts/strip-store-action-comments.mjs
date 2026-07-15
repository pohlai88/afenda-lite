import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"src",
	"store",
);

for (const name of fs.readdirSync(dir)) {
	if (!name.endsWith(".ts")) {
		continue;
	}
	const file = path.join(dir, name);
	const text = fs.readFileSync(file, "utf8");
	const next = text.replace(
		/\/\*\*\s*\n(?:\s*\*[^\n]*\n)*?\s*\* ! import[^\n]*\n\s*\*\/\r?\n\r?\n/g,
		"",
	);
	if (next !== text) {
		fs.writeFileSync(file, next);
		console.log("stripped", name);
	}
}
