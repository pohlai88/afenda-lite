import fs from "node:fs";
import path from "node:path";

const base =
	"C:/JackProject/afenda-bolt/afenda-lite/_reference/archive/shadcn-pro-dashboard/src/views";

function walk(dir, out = []) {
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name);
		const st = fs.statSync(p);
		if (st.isDirectory()) walk(p, out);
		else out.push(p);
	}
	return out;
}

const files = walk(base);
const byTop = {};
for (const f of files) {
	const rel = path.relative(base, f).replaceAll("\\", "/");
	const top = rel.split("/")[0];
	byTop[top] = (byTop[top] || 0) + 1;
}
console.log("byTop", byTop);
console.log("total", files.length);

const roots = new Set();
const samples = [];
for (const f of files) {
	if (!/\.(tsx?|jsx?)$/.test(f)) continue;
	const text = fs.readFileSync(f, "utf8");
	for (const m of text.matchAll(/from ['"](@\/[^'"]+)['"]/g)) {
		const imp = m[1];
		const parts = imp.split("/");
		roots.add(parts.slice(0, 3).join("/"));
		if (samples.length < 40) samples.push(`${path.relative(base, f)} -> ${imp}`);
	}
}
console.log("roots");
for (const r of [...roots].sort()) console.log(r);
