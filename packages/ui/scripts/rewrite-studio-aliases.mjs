import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("packages/ui/src/components/ui");

const replacements = [
	["@afenda/ui/lib/utils", "../../lib/utils"],
	["@/lib/utils", "../../lib/utils"],
	["@afenda/ui/hooks/use-mobile", "../../hooks/use-mobile"],
	["@/hooks/use-mobile", "../../hooks/use-mobile"],
	["@afenda/ui/components/ui/", "./"],
	["@/components/ui/", "./"],
];

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
	const full = path.join(dir, file);
	let src = fs.readFileSync(full, "utf8");
	let next = src;
	for (const [from, to] of replacements) {
		next = next.replaceAll(from, to);
	}
	if (next !== src) {
		fs.writeFileSync(full, next);
		console.log("rewrote", file);
	}
}
