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
	if (
		t.includes("getCalendarData") ||
		t.includes("getKanbanData") ||
		t.includes("getMailData") ||
		t.includes("getMembersData") ||
		t.includes("getSessionsData") ||
		t.includes("getIntegrationsData") ||
		t.includes("getProfileData") ||
		t.includes("getPricingData") ||
		t.includes("getFaqData") ||
		t.includes("app/server")
	) {
		hits.push(path.relative(base, f).replaceAll("\\", "/"));
	}
}
console.log(hits.join("\n"));
