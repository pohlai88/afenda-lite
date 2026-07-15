import fs from "node:fs";
import path from "node:path";

const base =
	"C:/JackProject/afenda-bolt/afenda-lite/_reference/archive/shadcn-pro-dashboard/src/app/(pages)";

function walk(d, out = []) {
	for (const n of fs.readdirSync(d)) {
		const p = path.join(d, n);
		if (fs.statSync(p).isDirectory()) walk(p, out);
		else if (n === "page.tsx") out.push(p);
	}
	return out;
}

function classify(text) {
	const viewImports = [...text.matchAll(/from ['"](@\/views\/[^'"]+)['"]/g)].map(
		(m) => m[1],
	);
	const componentImports = [
		...text.matchAll(/from ['"](@\/components\/[^'"]+)['"]/g),
	].map((m) => m[1]);
	const lineCount = text.trim().split(/\n/).length;
	const isCompose =
		viewImports.length >= 2 ||
		(viewImports.length >= 1 &&
			(text.includes("StatisticsCard") ||
				text.includes("grid") ||
				componentImports.some((i) => i.includes("/ui/card"))));
	const isThinRedirect =
		viewImports.length === 1 &&
		lineCount <= 25 &&
		!text.includes("StatisticsCard") &&
		!/className=['\"]grid/.test(text);
	return {
		lineCount,
		viewImports: viewImports.length,
		componentImports: componentImports.length,
		isCompose,
		isThinRedirect,
	};
}

console.log("kind | lines | views | compose | thin | path");
for (const p of walk(base).sort()) {
	const rel = path.relative(base, p).replaceAll("\\", "/");
	const c = classify(fs.readFileSync(p, "utf8"));
	const kind = rel.startsWith("dashboard/") ? "DASH" : "PAGE";
	console.log(
		`${kind} | ${String(c.lineCount).padStart(3)} | v=${c.viewImports} | compose=${c.isCompose} | thin=${c.isThinRedirect} | ${rel}`,
	);
}

console.log("\n--- dashboard page heads ---");
for (const name of fs.readdirSync(path.join(base, "dashboard"))) {
	const page = path.join(base, "dashboard", name, "page.tsx");
	if (!fs.existsSync(page)) continue;
	const t = fs.readFileSync(page, "utf8");
	const views = [...t.matchAll(/from ['"](@\/views\/[^'"]+)['"]/g)].map((m) => m[1]);
	console.log(`\n${name}: views=${views.length}`);
	for (const v of views) console.log(`  ${v}`);
}
