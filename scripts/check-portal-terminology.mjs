import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const COMPONENTS_DIR = join(ROOT, "components");

const ALLOWED_LITERALS = new Set([
  "survey-title",
  "survey-description",
]);

const BANNED = [
  { label: "user-facing 'survey'", test: (text) => /\bsurvey\b/i.test(text) },
  { label: "operator portal", test: (text) => /\boperator portal\b/i.test(text) },
  { label: "admin portal", test: (text) => /\badmin portal\b/i.test(text) },
  { label: "operator sign in", test: (text) => /\boperator sign[- ]in\b/i.test(text) },
];

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      files.push(...walk(path));
      continue;
    }
    if (/\.(tsx|ts)$/.test(name)) {
      files.push(path);
    }
  }
  return files;
}

function scrubTechnicalSymbols(content) {
  return content
    .replace(/^import .+$/gm, "")
    .replace(/\bsurveyId\b/g, "")
    .replace(/\bSurvey[A-Z][A-Za-z]*/g, "")
    .replace(/\b(create|update|delete|submit)Survey[A-Za-z]*/g, "")
    .replace(/\bgetSurvey[A-Za-z]*/g, "")
    .replace(/\blistQuestionsForSurvey\b/g, "")
    .replace(/\bisAdminSession\b/g, "")
    .replace(/invite-email-\$\{surveyId\}/g, "")
    .replace(/`invite-email-\$\{surveyId\}`/g, "");
}

function extractStringLiterals(content) {
  const literals = [];
  const pattern = /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g;

  for (const match of content.matchAll(pattern)) {
    literals.push(match[2]);
  }

  return literals;
}

function checkFile(path) {
  const content = readFileSync(path, "utf8");
  const scrubbed = scrubTechnicalSymbols(content);
  const violations = [];

  for (const literal of extractStringLiterals(scrubbed)) {
    if (ALLOWED_LITERALS.has(literal)) continue;

    for (const rule of BANNED) {
      if (rule.test(literal)) {
        violations.push({ rule: rule.label, literal });
      }
    }
  }

  if (violations.length > 0) {
    return { path: relative(ROOT, path), violations };
  }

  return null;
}

const files = walk(COMPONENTS_DIR);
const results = files.map(checkFile).filter(Boolean);

if (results.length > 0) {
  console.error("Portal terminology check failed:\n");
  for (const result of results) {
    console.error(`  ${result.path}`);
    for (const violation of result.violations) {
      console.error(`    - ${violation.rule}: "${violation.literal}"`);
    }
  }
  process.exit(1);
}

console.log(`Portal terminology OK (${files.length} component files scanned).`);
