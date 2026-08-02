import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { generatorContracts } from "../contracts.ts";
import {
	discoverWorkspaces,
	findWorkspacePathCaseCollisions,
	normalizeWorkspacePath,
	WorkspaceDiscoveryError,
} from "../engine/workspace-discovery.ts";

const cleanupPaths = new Set<string>();

const createTemporaryDirectory = async (prefix: string): Promise<string> => {
	const directory = await mkdtemp(join(tmpdir(), prefix));
	cleanupPaths.add(directory);
	return directory;
};

const writeJson = async (path: string, value: unknown): Promise<void> => {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const createWorkspace = async (
	repositoryRoot: string,
	workspacePath: string,
	name: string,
): Promise<void> => {
	await writeJson(join(repositoryRoot, workspacePath, "package.json"), {
		name,
		private: true,
		type: "module",
	});
};

const createRepositoryFixture = async (): Promise<string> => {
	const repositoryRoot = await createTemporaryDirectory("afenda-discovery-");
	await writeJson(join(repositoryRoot, "package.json"), {
		name: "afenda-discovery-fixture",
		private: true,
	});
	await writeJson(join(repositoryRoot, "turbo.json"), {});
	await writeFile(
		join(repositoryRoot, "pnpm-workspace.yaml"),
		'packages:\n  - "apps/*"\n  - "packages/*/*"\n',
		"utf8",
	);
	await createWorkspace(repositoryRoot, "apps/web", "@afenda/web");
	await createWorkspace(
		repositoryRoot,
		"packages/foundation/errors",
		"@afenda/errors",
	);
	await createWorkspace(
		repositoryRoot,
		"packages/erp/inventory",
		"@afenda/inventory",
	);
	return repositoryRoot;
};

const captureDiscoveryError = async (
	repositoryRoot: string,
): Promise<WorkspaceDiscoveryError> => {
	try {
		await discoverWorkspaces({
			contracts: generatorContracts,
			repositoryRoot,
		});
	} catch (error: unknown) {
		if (error instanceof WorkspaceDiscoveryError) {
			return error;
		}
		throw error;
	}
	throw new Error("expected workspace discovery to fail");
};

const hasIssue = (
	error: WorkspaceDiscoveryError,
	kind: WorkspaceDiscoveryError["issues"][number]["kind"],
): boolean => error.issues.some((issue) => issue.kind === kind);

afterEach(async () => {
	const paths = [...cleanupPaths];
	cleanupPaths.clear();
	await Promise.all(
		paths.map((path) => rm(path, { force: true, recursive: true })),
	);
});

describe("discoverWorkspaces", () => {
	it("discovers and deterministically classifies normal workspace candidates", async () => {
		const repositoryRoot = await createRepositoryFixture();

		const first = await discoverWorkspaces({
			contracts: generatorContracts,
			repositoryRoot,
		});
		const second = await discoverWorkspaces({
			contracts: generatorContracts,
			repositoryRoot,
		});

		expect(second).toEqual(first);
		expect(Object.isFrozen(first)).toBe(true);
		expect(first.workspacePatterns).toEqual(["apps/*", "packages/*/*"]);
		expect(first.workspaces).toEqual([
			{
				classification: { kind: "outside-generator-families" },
				moduleType: "module",
				name: "@afenda/web",
				path: "apps/web",
				private: true,
			},
			{
				classification: { kind: "generator-family", family: "erp" },
				moduleType: "module",
				name: "@afenda/inventory",
				path: "packages/erp/inventory",
				private: true,
			},
			{
				classification: { kind: "generator-family", family: "kernel" },
				moduleType: "module",
				name: "@afenda/errors",
				path: "packages/foundation/errors",
				private: true,
			},
		]);
	});

	it("rejects a workspace-pattern directory without package identity", async () => {
		const repositoryRoot = await createRepositoryFixture();
		await mkdir(join(repositoryRoot, "packages/erp/not-a-workspace"), {
			recursive: true,
		});

		const error = await captureDiscoveryError(repositoryRoot);

		expect(hasIssue(error, "non-workspace-directory")).toBe(true);
	});

	it("rejects duplicate package names", async () => {
		const repositoryRoot = await createRepositoryFixture();
		await createWorkspace(
			repositoryRoot,
			"packages/erp/stock-copy",
			"@afenda/inventory",
		);

		const error = await captureDiscoveryError(repositoryRoot);

		expect(hasIssue(error, "duplicate-package-name")).toBe(true);
	});

	it("detects case-collision paths independently of host filesystem casing", () => {
		const issues = findWorkspacePathCaseCollisions([
			"packages/erp/Sales",
			"packages/erp/sales",
		]);

		expect(issues).toEqual([
			{
				kind: "case-collision",
				path: "packages/erp/sales",
				message:
					"workspace path collides with 'packages/erp/Sales' when case-folded",
			},
		]);
	});

	it("rejects an unexpected nested package", async () => {
		const repositoryRoot = await createRepositoryFixture();
		await createWorkspace(
			repositoryRoot,
			"packages/erp/inventory/nested",
			"@afenda/inventory-nested",
		);

		const error = await captureDiscoveryError(repositoryRoot);

		expect(hasIssue(error, "nested-workspace")).toBe(true);
	});

	it("rejects a symlink or junction that escapes the repository", async () => {
		const repositoryRoot = await createRepositoryFixture();
		const outsideRoot = await createTemporaryDirectory(
			"afenda-discovery-outside-",
		);
		await writeJson(join(outsideRoot, "package.json"), {
			name: "@afenda/outside",
			private: true,
		});
		await symlink(
			outsideRoot,
			join(repositoryRoot, "packages/erp/outside"),
			process.platform === "win32" ? "junction" : "dir",
		);

		const error = await captureDiscoveryError(repositoryRoot);

		expect(hasIssue(error, "workspace-escape")).toBe(true);
	});

	it("rejects invalid package.json data", async () => {
		const repositoryRoot = await createRepositoryFixture();
		await writeFile(
			join(repositoryRoot, "packages/erp/inventory/package.json"),
			"{not-json",
			"utf8",
		);

		const error = await captureDiscoveryError(repositoryRoot);

		expect(hasIssue(error, "invalid-package-json")).toBe(true);
	});

	it("verifies the repository root markers", async () => {
		const repositoryRoot = await createTemporaryDirectory(
			"afenda-invalid-repository-",
		);

		const error = await captureDiscoveryError(repositoryRoot);

		expect(hasIssue(error, "invalid-repository-root")).toBe(true);
	});

	it("rejects workspace patterns that can escape the repository", async () => {
		const repositoryRoot = await createRepositoryFixture();
		await writeFile(
			join(repositoryRoot, "pnpm-workspace.yaml"),
			'packages:\n  - "../outside/*"\n',
			"utf8",
		);

		const error = await captureDiscoveryError(repositoryRoot);

		expect(hasIssue(error, "invalid-workspace-pattern")).toBe(true);
	});

	it.each([
		"packages/./*",
		"packages///*",
		`packages/${String.fromCharCode(0)}/*`,
	])("rejects non-normalized workspace pattern %j", async (pattern) => {
		const repositoryRoot = await createRepositoryFixture();
		await writeFile(
			join(repositoryRoot, "pnpm-workspace.yaml"),
			`packages:\n  - ${JSON.stringify(pattern)}\n`,
			"utf8",
		);

		const error = await captureDiscoveryError(repositoryRoot);

		expect(hasIssue(error, "invalid-workspace-pattern")).toBe(true);
	});

	it("normalizes Windows and POSIX workspace paths", () => {
		expect(normalizeWorkspacePath(".\\packages\\erp\\inventory")).toBe(
			"packages/erp/inventory",
		);
		expect(normalizeWorkspacePath("./packages/erp/inventory")).toBe(
			"packages/erp/inventory",
		);
	});
});
