import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "scratch") continue;
      walk(p, out);
    } else if (name.endsWith(".md")) {
      out.push(p.split(path.sep).join("/"));
    }
  }
  return out;
}

const files = walk("docs").sort();
const rows = [];
for (const f of files) {
  const t = readFileSync(f, "utf8");
  const base = path.basename(f);
  const isReadme = base === "README.md";
  const hasFieldTable = /\|\s*(?:\*\*)?Field(?:\*\*)?\s*\|\s*(?:\*\*)?Value(?:\*\*)?\s*\|/i.test(t);
  const cs =
    t.match(/\|\s*\*\*Control State\*\*\s*\|\s*([^|\n]+)\|/)?.[1]?.trim() ||
    t.match(/\|\s*Control State\s*\|\s*([^|\n]+)\|/)?.[1]?.trim() ||
    "MISSING";
  const status =
    t.match(/\|\s*\*\*Status\*\*\s*\|\s*([^|\n]+)\|/)?.[1]?.trim() ||
    t.match(/\|\s*Status\s*\|\s*([^|\n]+)\|/)?.[1]?.trim() ||
    "";
  const id =
    t.match(/\|\s*\*\*ID\*\*\s*\|\s*([^|\n]+)\|/)?.[1]?.trim() ||
    t.match(/\|\s*ID\s*\|\s*([^|\n]+)\|/)?.[1]?.trim() ||
    "";
  rows.push({ f, cs, status, id, isReadme, hasFieldTable });
}

const missing = rows.filter((r) => !r.isReadme && r.hasFieldTable && r.cs === "MISSING");
const byFolder = {};
for (const r of missing) {
  const folder = r.f.split("/").slice(0, 2).join("/");
  byFolder[folder] = (byFolder[folder] || 0) + 1;
}
console.log(
  JSON.stringify(
    {
      totalMd: rows.length,
      missingControlState: missing.length,
      byFolder,
      missing: missing.map((r) => r.f),
      readme: rows.filter((r) => r.isReadme).length,
      already: rows.filter((r) => r.cs !== "MISSING" && !r.isReadme).length,
    },
    null,
    2,
  ),
);
