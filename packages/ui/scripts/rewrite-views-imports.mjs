import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

const ILLUSTRATION_MAP = {
	"@/assets/svg/404": "assets/illustrations/empty/not-found",
	"@/assets/svg/review-complete": "assets/illustrations/empty/review-complete",
	"@/assets/svg/form-wizard-account": "assets/illustrations/form-wizard/account",
	"@/assets/svg/form-wizard-address": "assets/illustrations/form-wizard/address",
	"@/assets/svg/form-wizard-personal-info":
		"assets/illustrations/form-wizard/personal-info",
	"@/assets/svg/form-wizard-review": "assets/illustrations/form-wizard/review",
	"@/assets/svg/form-wizard-social-link":
		"assets/illustrations/form-wizard/social-link",
	"@/assets/svg/customers-card-svg": "assets/illustrations/dashboard/customers-card",
	"@/assets/svg/total-orders-card-svg":
		"assets/illustrations/dashboard/total-orders-card",
	"@/assets/svg/apps/contact/add-new": "assets/illustrations/contact/add-new",
};

function walk(dir, out = []) {
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name);
		if (fs.statSync(p).isDirectory()) walk(p, out);
		else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
	}
	return out;
}

function toRel(fromFile, absUnderSrc) {
	const fromDir = path.dirname(fromFile);
	let rel = path.relative(fromDir, path.join(srcRoot, absUnderSrc)).replaceAll("\\", "/");
	if (!rel.startsWith(".")) rel = `./${rel}`;
	return rel;
}

function rewriteFile(file) {
	let text = fs.readFileSync(file, "utf8");
	if (!text.includes("@/")) return false;

	// fake-db → seed-db alias first
	text = text.replaceAll("@/fake-db/", "@/seed-db/");

	// illustration remaps (exact specifier → keep as temporary @/tokens then convert)
	for (const [from, to] of Object.entries(ILLUSTRATION_MAP)) {
		text = text.replaceAll(from, `@/${to}`);
	}

	text = text.replace(/from ['"](@\/[^'"]+)['"]/g, (full, spec) => {
		const abs = spec.slice(2); // drop @/
		const rel = toRel(file, abs);
		const q = full.includes("'") ? "'" : '"';
		return `from ${q}${rel}${q}`;
	});

	// also rewrite import("...") dynamic if any
	text = text.replace(/import\(['"](@\/[^'"]+)['"]\)/g, (full, spec) => {
		const abs = spec.slice(2);
		const rel = toRel(file, abs);
		const q = full.includes("'") ? "'" : '"';
		return `import(${q}${rel}${q})`;
	});

	fs.writeFileSync(file, text);
	return true;
}

const files = walk(srcRoot);
let changed = 0;
const leftover = [];
for (const f of files) {
	if (rewriteFile(f)) changed++;
	const t = fs.readFileSync(f, "utf8");
	if (t.includes("@/")) leftover.push(path.relative(srcRoot, f).replaceAll("\\", "/"));
}

console.log("rewrote", changed, "files");
console.log("leftover @/", leftover.length);
for (const f of leftover.slice(0, 30)) console.log(" ", f);
