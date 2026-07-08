#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseEnvFile } from "./lib/env-files.mjs";

const [blockName, ...skipTargets] = process.argv.slice(2);
if (!blockName) {
  console.error("Usage: node scripts/install-studio-block.mjs <block-name> [skip-target...]");
  process.exit(1);
}

const api = parseEnvFile("env.secret").SHADCN_STUDIO_API_KEY;
const email =
  parseEnvFile("env.config").EMAIL ??
  parseEnvFile("env.config").SHADCN_STUDIO_EMAIL;

if (!api || !email) {
  console.error("Missing SHADCN_STUDIO_API_KEY or EMAIL");
  process.exit(1);
}

const url =
  `https://shadcnstudio.com/r/blocks/base-nova/${blockName}.json` +
  `?license_key=${encodeURIComponent(api)}&email=${encodeURIComponent(email)}`;

const res = await fetch(url, {
  headers: { "x-license-key": api, "x-email": email },
});

if (!res.ok) {
  console.error(`Failed to fetch block (${res.status})`);
  process.exit(1);
}

const block = await res.json();
const root = process.cwd();

for (const file of block.files ?? []) {
  if (skipTargets.some((target) => file.target === target)) {
    console.log("skip", file.target);
    continue;
  }

  const path = resolve(root, file.target);
  mkdirSync(dirname(path), { recursive: true });

  let content = file.content;
  if (file.target.endsWith("datatable-transaction.tsx")) {
    content = adaptDatatableTransaction(content);
  } else if (file.target.endsWith("statistics-card-03.tsx")) {
    content = adaptStatisticsCard(content);
  } else if (file.target.startsWith("app/") && file.target.endsWith("/page.tsx")) {
    console.log("skip", file.target, "(demo route)");
    continue;
  }

  writeFileSync(path, content);
  console.log("wrote", file.target);
}

function adaptDatatableTransaction(source) {
  return source
    .replace(
      /import \{ IconPlaceholder \} from '@\/registry\/icons\/icon-placeholder'\n/,
      "import { ChevronLeftIcon, ChevronRightIcon, EllipsisVerticalIcon } from 'lucide-react'\n",
    )
    .replace(
      /<IconPlaceholder[\s\S]*?lucide='ChevronLeftIcon'[\s\S]*?\/>/,
      "<ChevronLeftIcon aria-hidden='true' />",
    )
    .replace(
      /<IconPlaceholder[\s\S]*?lucide='ChevronRightIcon'[\s\S]*?\/>/,
      "<ChevronRightIcon aria-hidden='true' />",
    )
    .replace(
      /<IconPlaceholder[\s\S]*?lucide='EllipsisVerticalIcon'[\s\S]*?\/>/,
      "<EllipsisVerticalIcon className='size-5' aria-hidden='true' />",
    );
}

function adaptStatisticsCard(source) {
  return source
    .replace(
      /import \{ IconPlaceholder \} from '@\/registry\/icons\/icon-placeholder'\n/,
      "import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'\n",
    )
    .replace(
      /<IconPlaceholder[\s\S]*?lucide='ChevronUpIcon'[\s\S]*?\/>/,
      '<ChevronUpIcon aria-hidden="true" className="size-4" />',
    )
    .replace(
      /<IconPlaceholder[\s\S]*?lucide='ChevronDownIcon'[\s\S]*?\/>/,
      '<ChevronDownIcon aria-hidden="true" className="size-4" />',
    );
}
