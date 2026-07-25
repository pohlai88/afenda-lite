/**
 * Generates legacy-classifications.ts and domains/leave.ts from the current
 * mutation-emission-registry array (run once before compat refactor).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");
const emissionsDir = path.join(pkgRoot, "src/emissions");

function parseStringConstMap(source, pattern) {
	const map = new Map();
	for (const match of source.matchAll(pattern)) {
		map.set(match[2], match[1]);
	}
	return map;
}

const moduleIdsSource = fs.readFileSync(
	path.join(pkgRoot, "src/module-ids.ts"),
	"utf8",
);
const eventsSource = fs.readFileSync(
	path.join(
		pkgRoot,
		"../../data-plane/events/src/schemas/human-resources.events.ts",
	),
	"utf8",
);

const commandConstByValue = parseStringConstMap(
	moduleIdsSource,
	/export const (HUMAN_RESOURCES_COMMAND_\w+) =\s*\n?\s*["']([^"']+)["']/g,
);
const eventConstByValue = parseStringConstMap(
	eventsSource,
	/export const (HUMAN_RESOURCES_\w+_EVENT) =\s*\n?\s*["']([^"']+)["']/g,
);

const registryModule = await import(
	pathToFileURL(path.join(pkgRoot, "src/mutation-emission-registry.ts")).href
);
const { HUMAN_RESOURCES_LEAVE_COMMAND_IDS } = await import(
	pathToFileURL(path.join(pkgRoot, "src/module-ids.ts")).href
);

const { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY } = registryModule;
const leaveSet = new Set(HUMAN_RESOURCES_LEAVE_COMMAND_IDS);

const legacyEntries = [];
const leaveEntries = [];

for (const entry of HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY) {
	if (leaveSet.has(entry.command)) {
		leaveEntries.push(entry);
	} else {
		legacyEntries.push(entry);
	}
}

function commandConst(commandValue) {
	const name = commandConstByValue.get(commandValue);
	if (!name) {
		throw new Error(`No command constant for ${commandValue}`);
	}
	return name;
}

function eventConst(eventValue) {
	const name = eventConstByValue.get(eventValue);
	if (!name) {
		throw new Error(`No event constant for ${eventValue}`);
	}
	return name;
}

function inferLeaveAggregate(commandValue) {
	if (commandValue.includes(".leave-policy.")) return "leave_policy";
	if (commandValue.includes(".leave-entitlement.")) return "leave_entitlement";
	if (commandValue.includes(".leave-request.")) return "leave_request";
	return "leave_entity";
}

function formatEntry(entry, useInfer) {
	const isDomain = entry.emission === "domain_event";
	const fn = isDomain ? "defineDomainEventEmission" : "defineAuditOnlyEmission";
	const cmd = commandConst(entry.command);
	let metaLines;
	if (useInfer) {
		metaLines = `\t\t...inferEmissionMetadata(${cmd}),`;
	} else {
		metaLines = `\t\t\tdomain: "leave",\n\t\t\taggregateType: "${inferLeaveAggregate(entry.command)}",`;
	}
	let eventPart = "";
	if (isDomain && entry.eventTypes?.length) {
		const types = entry.eventTypes.map((et) => eventConst(et)).join(", ");
		eventPart = `\n\t\t\teventTypes: [${types}] as const,`;
	}
	if (useInfer) {
		return `\t[${cmd}]: ${fn}(\n\t\t${cmd},\n\t\t{\n${metaLines}${eventPart}\n\t\t},\n\t),`;
	}
	return `\t[${cmd}]: ${fn}(\n\t\t${cmd},\n\t\t{\n${metaLines}${eventPart}\n\t\t},\n\t),`;
}

function collectCommandImports(entries) {
	return [...new Set(entries.map((e) => commandConst(e.command)))].sort();
}

function collectEventImports(entries) {
	const set = new Set();
	for (const entry of entries) {
		if (entry.eventTypes) {
			for (const et of entry.eventTypes) {
				set.add(eventConst(et));
			}
		}
	}
	return [...set].sort();
}

function buildLegacyFile() {
	const eventImports = collectEventImports(legacyEntries);
	const commandImports = collectCommandImports(legacyEntries);
	const lines = [
		`/**`,
		` * Preserved non-leave emission classifications (PR 3.0 migration).`,
		` * Leave commands live in domains/leave.ts only.`,
		` *`,
		` * Count: ${legacyEntries.length} entries — drain into typed domain files in PR 3.2+.`,
		` */`,
	];
	if (eventImports.length > 0) {
		lines.push(`import {`);
		for (const c of eventImports) lines.push(`\t${c},`);
		lines.push(`} from "@afenda/events/schemas";`);
		lines.push(``);
	}
	lines.push(`import {`);
	for (const c of commandImports) lines.push(`\t${c},`);
	lines.push(`\ttype HumanResourcesCommandId,`);
	lines.push(`} from "../module-ids";`);
	lines.push(``);
	lines.push(
		`import { defineAuditOnlyEmission, defineDomainEventEmission } from "../define-emission";`,
	);
	lines.push(
		`import { inferEmissionMetadata } from "../infer-emission-metadata";`,
	);
	lines.push(
		`import type { HumanResourcesMutationEmissionDefinition } from "../types";`,
	);
	lines.push(``);
	lines.push(
		`export const HUMAN_RESOURCES_LEGACY_EMISSION_CLASSIFICATIONS = {`,
	);
	for (const entry of legacyEntries) {
		lines.push(formatEntry(entry, true));
	}
	lines.push(`} satisfies Partial<`);
	lines.push(
		`\tRecord<HumanResourcesCommandId, HumanResourcesMutationEmissionDefinition>`,
	);
	lines.push(`>;`);
	lines.push(``);
	return lines.join("\n");
}

function buildLeaveFile() {
	const eventImports = collectEventImports(leaveEntries);
	const commandImports = collectCommandImports(leaveEntries);
	const out = [];
	if (eventImports.length > 0) {
		out.push(`import {`);
		for (const c of eventImports) out.push(`\t${c},`);
		out.push(`} from "@afenda/events/schemas";`);
		out.push(``);
	}
	out.push(`import {`);
	for (const c of commandImports) out.push(`\t${c},`);
	out.push(`\ttype HumanResourcesLeaveCommandId,`);
	out.push(`} from "../../module-ids";`);
	out.push(``);
	out.push(
		`import { defineAuditOnlyEmission, defineDomainEventEmission } from "../define-emission";`,
	);
	out.push(
		`import type { HumanResourcesMutationEmissionDefinition } from "../types";`,
	);
	out.push(``);
	out.push(`export const HUMAN_RESOURCES_LEAVE_EMISSIONS = {`);
	for (const entry of leaveEntries) {
		out.push(formatEntry(entry, false));
	}
	out.push(`} satisfies Record<`);
	out.push(`\tHumanResourcesLeaveCommandId,`);
	out.push(`\tHumanResourcesMutationEmissionDefinition`);
	out.push(`>;`);
	out.push(``);
	return out.join("\n");
}

console.log(`Legacy: ${legacyEntries.length}, Leave: ${leaveEntries.length}`);

fs.mkdirSync(path.join(emissionsDir, "domains"), { recursive: true });
fs.writeFileSync(
	path.join(emissionsDir, "legacy-classifications.ts"),
	buildLegacyFile(),
);
fs.writeFileSync(path.join(emissionsDir, "domains/leave.ts"), buildLeaveFile());

console.log("Wrote legacy-classifications.ts and domains/leave.ts");
