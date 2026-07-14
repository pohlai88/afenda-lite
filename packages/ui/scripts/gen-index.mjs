import fs from "node:fs";
import path from "node:path";

const dir = "packages/ui/src/components/ui";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".tsx")).sort();
const lines = ['export { cn } from "./lib/utils";', ""];

for (const file of files) {
	const name = file.replace(/\.tsx$/, "");
	const src = fs.readFileSync(path.join(dir, file), "utf8");
	const named = [];

	for (const block of src.match(/export\s*\{[^}]+\}/gs) ?? []) {
		const inner = block.replace(/^export\s*\{/, "").replace(/\}$/, "");
		for (const part of inner.split(",")) {
			const trimmed = part.trim();
			if (trimmed) named.push(trimmed);
		}
	}

	for (const match of src.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/gm)) {
		named.push(match[1]);
	}

	for (const match of src.matchAll(/^export\s+const\s+([A-Za-z0-9_]+)/gm)) {
		named.push(match[1]);
	}

	const defaultMatch = src.match(/^export\s+default\s+(?:function\s+)?([A-Za-z0-9_]+)/m);
	const uniq = [...new Set(named)];

	if (uniq.length > 0) {
		lines.push("export {");
		lines.push(`  ${uniq.join(",\n  ")}`);
		lines.push(`} from "./components/ui/${name}";`);
		lines.push("");
	}

	if (defaultMatch) {
		lines.push(
			`export { default as ${defaultMatch[1]} } from "./components/ui/${name}";`,
		);
		lines.push("");
	} else if (uniq.length === 0) {
		console.error("NO EXPORT", file);
	}
}

fs.writeFileSync("packages/ui/src/index.ts", `${lines.join("\n")}\n`);
console.log(`wrote ${files.length} components`);
