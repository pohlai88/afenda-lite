import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const storiesDir = join(repoRoot, "stories", "ui-evaluation");
const fixturesDir = join(
  repoRoot,
  "components",
  "portal-atmosphere",
  "fixtures",
);

const FORBIDDEN_PATTERNS = [
  { pattern: /from\s+["']@neondatabase/, label: "@neondatabase/* import" },
  { pattern: /from\s+["']@\/app\/actions/, label: "app/actions import" },
  {
    pattern: /\bimport\s+[^;]*\bAuthView\b/,
    label: "AuthView import",
  },
  {
    pattern: /\bimport\s+[^;]*\bcreateAuthClient\b/,
    label: "createAuthClient import",
  },
  {
    pattern: /\bimport\s+[^;]*\bcreateNeonAuth\b/,
    label: "createNeonAuth import",
  },
  {
    pattern: /\bimport\s+[^;]*\brequireAdminSession\b/,
    label: "requireAdminSession import",
  },
  {
    pattern: /\bimport\s+[^;]*\brequireClientSession\b/,
    label: "requireClientSession import",
  },
  {
    pattern: /\bimport\s+[^;]*\bportal-auth-neon-view\b/,
    label: "portal-auth-neon-view import",
  },
  {
    pattern: /\bimport\s+[^;]*\bPortalAuthLayout\b/,
    label: "PortalAuthLayout import",
  },
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

    if (/\.(tsx?|jsx?|mdx)$/.test(entry)) {
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

function checkPaP7Authority() {
  const authorityStory = join(storiesDir, "portal-atmosphere.stories.tsx");

  if (!existsSync(authorityStory)) {
    return ["portal-atmosphere.stories.tsx is missing (PA-P7 authority story)"];
  }

  const source = readFileSync(authorityStory, "utf8");
  const violations = [];

  if (!source.includes("PortalAtmospherePreview")) {
    violations.push(
      "portal-atmosphere.stories.tsx must render PortalAtmospherePreview (fixture authority)",
    );
  }

  if (/\bimport\s+[^;]*\bPortalAuthLayout\b/.test(source)) {
    violations.push(
      "portal-atmosphere.stories.tsx must not import PortalAuthLayout",
    );
  }

  return violations;
}

const PA_P7_REQUIRED_STORIES = [
  "DarkDesktop",
  "LightDesktop",
  "SplitTheme",
  "PlaceholderAccessSlot",
  "ResponsiveMatrix",
];

const PA_P8_REQUIRED_STORIES = [
  "TabletDark",
  "TabletLight",
  "MobileDark",
  "MobileLight",
  "SmallMobileSmoke",
];

function checkPaP7RequiredStories() {
  const authorityStory = join(storiesDir, "portal-atmosphere.stories.tsx");
  const source = readFileSync(authorityStory, "utf8");
  const violations = [];

  for (const storyName of PA_P7_REQUIRED_STORIES) {
    if (!source.includes(`export const ${storyName}`)) {
      violations.push(
        `portal-atmosphere.stories.tsx missing PA-P7 story: ${storyName}`,
      );
    }
  }

  return violations;
}

function checkPaP8ResponsiveStories() {
  const authorityStory = join(storiesDir, "portal-atmosphere.stories.tsx");
  const source = readFileSync(authorityStory, "utf8");
  const violations = [];

  for (const storyName of PA_P8_REQUIRED_STORIES) {
    if (!source.includes(`export const ${storyName}`)) {
      violations.push(
        `portal-atmosphere.stories.tsx missing PA-P8 story: ${storyName}`,
      );
    }
  }

  return violations;
}

function main() {
  const storyFiles = listFiles(storiesDir).filter((file) =>
    /portal-atmosphere/i.test(file),
  );
  const fixtureFiles = listFiles(fixturesDir);
  const files = [...storyFiles, ...fixtureFiles];

  const violations = [
    ...checkForbiddenImports(files),
    ...checkPaP7Authority(),
    ...checkPaP7RequiredStories(),
    ...checkPaP8ResponsiveStories(),
  ];

  if (violations.length > 0) {
    console.error("storybook auth boundary check failed:\n");
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  }

  console.log(
    `storybook auth boundary OK (${files.length} portal-atmosphere story/fixture files)`,
  );
}

main();
