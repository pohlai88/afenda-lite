import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const atmosphereDir = join(repoRoot, "components", "portal-atmosphere");

const FORBIDDEN_PATTERNS = [
  { pattern: /from\s+["']@neondatabase/, label: "@neondatabase/* import" },
  { pattern: /from\s+["']@\/app\/actions/, label: "app/actions import" },
  { pattern: /\bimport\s+[^;]*\bAuthView\b/, label: "AuthView import" },
  { pattern: /\bimport\s+[^;]*\bcreateAuthClient\b/, label: "createAuthClient import" },
  { pattern: /\bimport\s+[^;]*\bcreateNeonAuth\b/, label: "createNeonAuth import" },
  { pattern: /\bimport\s+[^;]*\brequireAdminSession\b/, label: "requireAdminSession import" },
  { pattern: /\bimport\s+[^;]*\brequireClientSession\b/, label: "requireClientSession import" },
  { pattern: /\bimport\s+[^;]*\bportal-auth-neon-view\b/, label: "portal-auth-neon-view import" },
  { pattern: /\bimport\s+[^;]*\bPortalAuthLayout\b/, label: "PortalAuthLayout import" },
  { pattern: /\buseSession\b/, label: "useSession hook" },
  { pattern: /\breturnTo\b/, label: "returnTo parsing" },
];

function listFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...listFiles(fullPath));
      continue;
    }

    if (/\.(tsx?|jsx?)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

function relative(path) {
  return path.replace(`${repoRoot}\\`, "").replace(`${repoRoot}/`, "");
}

function stripSourceComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function checkForbiddenImports(files) {
  const violations = [];
  const scannable = files.filter((file) => !/\.test\.(ts|tsx)$/.test(file));

  for (const file of scannable) {
    const source = stripSourceComments(readFileSync(file, "utf8"));

    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      if (pattern.test(source)) {
        violations.push(`${relative(file)}: forbidden ${label}`);
      }
    }
  }

  return violations;
}

function checkPaP10SampleFixture() {
  const samplePath = join(
    atmosphereDir,
    "fixtures",
    "auth-slot-sample.tsx",
  );

  if (!existsSync(samplePath)) {
    return ["components/portal-atmosphere/fixtures/auth-slot-sample.tsx is missing"];
  }

  const source = readFileSync(samplePath, "utf8");

  if (!source.includes("PortalAtmospherePreview")) {
    return [
      "auth-slot-sample.tsx must compose through PortalAtmospherePreview (fixture authority)",
    ];
  }

  return [];
}

/** Production barrel must not re-export Storybook/review fixtures (PA-P7 boundary). */
function checkProductionBarrel() {
  const indexPath = join(atmosphereDir, "index.ts");

  if (!existsSync(indexPath)) {
    return ["components/portal-atmosphere/index.ts is missing"];
  }

  const source = stripSourceComments(readFileSync(indexPath, "utf8"));
  const violations = [];

  if (/from\s+["']\.\/fixtures\//.test(source)) {
    violations.push(
      "index.ts must not import from ./fixtures/ — use deep fixture imports in Storybook only",
    );
  }

  for (const symbol of [
    "PortalAtmospherePreview",
    "PortalAtmosphereSplitPreview",
    "AccessSlotPlaceholder",
  ]) {
    if (new RegExp(`export\\s*\\{[^}]*\\b${symbol}\\b`).test(source)) {
      violations.push(
        `index.ts must not re-export fixture ${symbol} — import from fixtures/ directly`,
      );
    }
  }

  return violations;
}

function main() {
  const files = listFiles(atmosphereDir);
  const violations = [
    ...checkForbiddenImports(files),
    ...checkPaP10SampleFixture(),
    ...checkProductionBarrel(),
  ];

  if (violations.length > 0) {
    console.error("portal atmosphere auth boundary check failed:\n");
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  }

  console.log(
    `Portal atmosphere auth boundary passed (${files.length} files scanned).`,
  );
}

main();
