import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"src",
	"views",
	"dashboards",
	"compositions",
);
const srcRoot = path.join(dir, "..", "..", "..");

function toRel(fromFile, absUnderSrc) {
	let rel = path
		.relative(path.dirname(fromFile), path.join(srcRoot, absUnderSrc))
		.replaceAll("\\", "/");
	if (!rel.startsWith(".")) rel = `./${rel}`;
	return rel;
}

for (const name of fs.readdirSync(dir)) {
	if (!name.endsWith(".tsx")) continue;
	const file = path.join(dir, name);
	let text = fs.readFileSync(file, "utf8");
	if (!text.includes("@/")) continue;

	text = text.replace(/from ['"](@\/[^'"]+)['"]/g, (full, spec) => {
		const abs = spec.slice(2);
		const rel = toRel(file, abs);
		const q = full.includes("'") ? "'" : '"';
		return `from ${q}${rel}${q}`;
	});

	const header =
		"/** Dashboard composition — AdminCN ERP option. Adapted from Studio app/(pages)/dashboard. */\n";
	if (!text.startsWith("/** Dashboard composition")) {
		text = header + text;
	}

	fs.writeFileSync(file, text);
	console.log("rewrote", name);
}
