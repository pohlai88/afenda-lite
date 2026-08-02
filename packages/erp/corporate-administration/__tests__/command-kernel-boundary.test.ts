import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceDirectory = fileURLToPath(new URL("../src/", import.meta.url));
const commandKernelPath = fileURLToPath(
	new URL("../src/kernel/internal/durable-command.ts", import.meta.url),
);
const queryKernelPath = fileURLToPath(
	new URL("../src/kernel/internal/query.ts", import.meta.url),
);

describe("Corporate Administration command kernel boundary", () => {
	it("owns durable execution once outside every business subdomain", () => {
		const findings: string[] = [];
		for (const file of sourceFiles(sourceDirectory)) {
			const normalized = file.replaceAll("\\", "/");
			if (!normalized.includes("/commands") || file === commandKernelPath) {
				continue;
			}
			const source = readFileSync(file, "utf8");
			for (const forbidden of [
				"runtime.idempotency.begin",
				"runtime.transaction.run",
				"runtime.outbox.append",
				"createCorporateAdministrationDomainEventEnvelope",
			]) {
				if (source.includes(forbidden)) {
					findings.push(`${normalized}: ${forbidden}`);
				}
			}
		}

		expect(findings).toEqual([]);
	});

	it("keeps the command kernel private and free of domain stores", () => {
		const kernel = readFileSync(commandKernelPath, "utf8");
		const rootFacade = readFileSync(`${sourceDirectory}/index.ts`, "utf8");

		expect(kernel).not.toContain("LegalCompanyCommandDependencies");
		expect(kernel).not.toContain("Store");
		expect(rootFacade).not.toContain("internal/durable-command");
		expect(rootFacade).not.toContain("executeCorporateAdministrationCommand");
		expect(rootFacade).not.toContain(
			"requireCorporateAdministrationPermission",
		);
		expect(rootFacade).not.toContain(
			"requireCorporateAdministrationApprovalIfConfigured",
		);
	});

	it("binds registry authorization to every durable command invocation", () => {
		const kernel = readFileSync(commandKernelPath, "utf8");
		const findings: string[] = [];
		let durableInvocations = 0;
		let authorizedInvocations = 0;

		for (const file of sourceFiles(sourceDirectory)) {
			const normalized = file.replaceAll("\\", "/");
			if (!normalized.includes("/commands") || file === commandKernelPath) {
				continue;
			}
			const source = readFileSync(file, "utf8");
			for (const forbidden of [
				"CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS",
				"requireCorporateAdministrationPermission",
				"function authorize(",
			]) {
				if (source.includes(forbidden)) {
					findings.push(`${normalized}: ${forbidden}`);
				}
			}
			durableInvocations +=
				source.match(/executeCorporateAdministrationCommand\(\{/g)?.length ?? 0;
			authorizedInvocations +=
				source.match(
					/executeCorporateAdministrationCommand\(\{\s*authorization:/g,
				)?.length ?? 0;
		}

		expect(kernel).toContain(
			"authorization: CorporateAdministrationAuthorizedCommandExecution",
		);
		expect(kernel).toContain(
			"getCorporateAdministrationOperationDefinition(operationId)",
		);
		expect(durableInvocations).toBeGreaterThan(0);
		expect(authorizedInvocations).toBe(durableInvocations);
		expect(findings).toEqual([]);
	});

	it("owns approval-policy interpretation and verification inside the kernel", () => {
		const kernel = readFileSync(commandKernelPath, "utf8");
		const findings: string[] = [];
		for (const file of sourceFiles(sourceDirectory)) {
			const normalized = file.replaceAll("\\", "/");
			if (!normalized.includes("/commands") || file === commandKernelPath) {
				continue;
			}
			const source = readFileSync(file, "utf8");
			for (const forbidden of [
				"approvalPolicy",
				"verifyCorporateAdministrationApproval",
				"requireCorporateAdministrationApprovalIfConfigured",
				"approvalDecisions.verify",
			]) {
				if (source.includes(forbidden)) {
					findings.push(`${normalized}: ${forbidden}`);
				}
			}
		}

		expect(kernel).toContain("operation.approvalPolicy");
		expect(kernel).toContain("verifyCorporateAdministrationApproval");
		expect(findings).toEqual([]);
	});

	it("owns command-observation interpretation without platform runtime imports", () => {
		const kernel = readFileSync(commandKernelPath, "utf8");
		const findings: string[] = [];
		for (const file of sourceFiles(sourceDirectory)) {
			const normalized = file.replaceAll("\\", "/").replaceAll("//", "/");
			const isCommandKernel =
				normalized ===
				commandKernelPath.replaceAll("\\", "/").replaceAll("//", "/");
			const isQueryKernel =
				normalized ===
				queryKernelPath.replaceAll("\\", "/").replaceAll("//", "/");
			const source = readFileSync(file, "utf8");
			if (/from\s+["']@afenda\/(?:logger|metrics)["']/.test(source)) {
				findings.push(
					`${normalized}: platform observability implementation import`,
				);
			}
			if (
				!(isCommandKernel || isQueryKernel) &&
				(source.includes("runtime.observability.recordOperation") ||
					source.includes("operation.observabilityClass"))
			) {
				findings.push(`${normalized}: command observation interpretation`);
			}
		}

		expect(kernel).toContain("runtime.observability.recordOperation");
		expect(kernel).toContain("operation.observabilityClass");
		expect(findings).toEqual([]);
	});

	it("deletes the superseded company-owned execution surface", () => {
		const allSource = sourceFiles(sourceDirectory).map((file) =>
			readFileSync(file, "utf8"),
		);
		expect(
			allSource.some((source) =>
				source.includes("company/commands/durable-command"),
			),
		).toBe(false);
		expect(
			allSource.some((source) =>
				source.includes("DurableLegalCompanyCommandDependencies"),
			),
		).toBe(false);
	});
});

function sourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = `${directory}/${entry.name}`;
		if (entry.isDirectory()) {
			return sourceFiles(path);
		}
		return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
	});
}
