import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const mapPath = join(process.cwd(), "docs/architecture/repo-migration-map.md");
const source = readFileSync(mapPath, "utf8");

const campaignOpen = /REPO_LAYOUT_CAMPAIGN_OPEN=true/.test(source);
const pendingRows = [...source.matchAll(/\| [^|]+ \| [^|]+ \| [^|]+ \| pending \|/g)];

if (!campaignOpen) {
  if (pendingRows.length > 0) {
    console.error(
      `check:repo-migration-map failed: campaign closed but ${pendingRows.length} row(s) still pending`,
    );
    process.exit(1);
  }
  console.log("check:repo-migration-map OK (campaign closed, no pending rows)");
  process.exit(0);
}

console.log(
  `check:repo-migration-map OK (campaign open; ${pendingRows.length} pending rows allowed)`,
);
