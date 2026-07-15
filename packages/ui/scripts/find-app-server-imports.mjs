import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

function walk(dir, out = []) {
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name);
		if (fs.statSync(p).isDirectory()) walk(p, out);
		else if (/\.(tsx?)$/.test(name)) out.push(p);
	}
	return out;
}

const hits = [];
for (const f of walk(base)) {
	const t = fs.readFileSync(f, "utf8");
	for (const m of t.matchAll(/from ['"]([^'"]*app\/server[^'"]*)['"]/g)) {
		hits.push(`${path.relative(base, f).replaceAll("\\", "/")} -> ${m[1]}`);
	}
}
console.log(hits.join("\n") || "(none)");
console.log("count", hits.length);
