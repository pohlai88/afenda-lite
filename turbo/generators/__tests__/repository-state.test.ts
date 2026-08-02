import {
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
	captureRepositoryState,
	compareRepositoryStates,
} from "../engine/repository-state.ts";
import { runGen04ReadOnlyProof } from "../evidence/gen-0.4-proof.ts";

const createInventoryFixture = async (): Promise<{
	readonly externalTarget: string;
	readonly repositoryRoot: string;
}> => {
	const repositoryRoot = await mkdtemp(join(tmpdir(), "afenda-state-fixture-"));
	const externalTarget = await mkdtemp(
		join(tmpdir(), "afenda-state-external-"),
	);
	await Promise.all([
		mkdir(join(repositoryRoot, "packages", "fixture", "dist"), {
			recursive: true,
		}),
		mkdir(join(repositoryRoot, "packages", "node_modules", "ignored"), {
			recursive: true,
		}),
		writeFile(join(externalTarget, "outside.txt"), "outside\n"),
	]);
	await Promise.all([
		writeFile(
			join(repositoryRoot, "packages", "fixture", "source.ts"),
			"export const value = 1;\n",
		),
		writeFile(
			join(repositoryRoot, "packages", "fixture", "dist", "generated.js"),
			"generated\n",
		),
		writeFile(
			join(repositoryRoot, "packages", "node_modules", "ignored", "index.js"),
			"ignored\n",
		),
		writeFile(join(repositoryRoot, "tsconfig.fixture.json"), "{}\n"),
	]);
	await symlink(
		externalTarget,
		join(repositoryRoot, "packages", "external-link"),
		process.platform === "win32" ? "junction" : "dir",
	);
	await symlink(
		externalTarget,
		join(repositoryRoot, "tsconfig.external.json"),
		process.platform === "win32" ? "junction" : "dir",
	);
	return Object.freeze({ repositoryRoot, externalTarget });
};

describe("generator repository state", () => {
	it("captures deterministic content and non-followed symlinks with fixed exclusions", async () => {
		const fixture = await createInventoryFixture();
		try {
			const first = await captureRepositoryState(fixture.repositoryRoot);
			const second = await captureRepositoryState(fixture.repositoryRoot);
			const paths = first.entries.map((entry) => entry.path);
			const symlinkEntry = first.entries.find(
				(entry) => entry.path === "packages/external-link",
			);
			const rootTsconfigSymlink = first.entries.find(
				(entry) => entry.path === "tsconfig.external.json",
			);

			expect(second).toEqual(first);
			expect(first.digest).toBe(second.digest);
			expect(paths).toContain("packages/fixture/source.ts");
			expect(paths).toContain("tsconfig.fixture.json");
			expect(paths).not.toContain("packages/fixture/dist/generated.js");
			expect(paths).not.toContain("packages/node_modules/ignored/index.js");
			expect(paths).not.toContain("packages/external-link/outside.txt");
			expect(paths).not.toContain("tsconfig.external.json/outside.txt");
			expect(symlinkEntry?.kind).toBe("symlink");
			expect(rootTsconfigSymlink?.kind).toBe("symlink");
			if (symlinkEntry?.kind !== "symlink") {
				throw new Error("expected the external link to remain a symlink entry");
			}
			expect(symlinkEntry.symlinkTarget.replaceAll("\\", "/")).toContain(
				"afenda-state-external-",
			);
		} finally {
			await Promise.all([
				rm(fixture.repositoryRoot, { force: true, recursive: true }),
				rm(fixture.externalTarget, { force: true, recursive: true }),
			]);
		}
	});

	it("reports deterministic added, changed, and removed paths", async () => {
		const fixture = await createInventoryFixture();
		try {
			const before = await captureRepositoryState(fixture.repositoryRoot);
			await Promise.all([
				writeFile(
					join(fixture.repositoryRoot, "packages", "fixture", "source.ts"),
					"export const value = 2;\n",
				),
				writeFile(
					join(fixture.repositoryRoot, "packages", "fixture", "added.ts"),
					"export {};\n",
				),
				rm(join(fixture.repositoryRoot, "tsconfig.fixture.json")),
			]);
			const after = await captureRepositoryState(fixture.repositoryRoot);
			const delta = compareRepositoryStates(before, after);

			expect(delta).toEqual({
				added: ["packages/fixture/added.ts"],
				changed: ["packages/fixture/source.ts"],
				removed: ["tsconfig.fixture.json"],
				count: 3,
			});
		} finally {
			await Promise.all([
				rm(fixture.repositoryRoot, { force: true, recursive: true }),
				rm(fixture.externalTarget, { force: true, recursive: true }),
			]);
		}
	});

	it("proves every GEN-0.4 doctor path and matches generated evidence", {
		timeout: 300_000,
	}, async () => {
		const testDirectory = dirname(fileURLToPath(import.meta.url));
		const repositoryRoot = resolve(testDirectory, "../../..");
		const evidencePath = resolve(
			testDirectory,
			"../evidence/gen-0.4-closure.json",
		);
		const expectedInput: unknown = JSON.parse(
			await readFile(evidencePath, "utf8"),
		);
		const actual = await runGen04ReadOnlyProof(repositoryRoot);

		expect(actual).toEqual(expectedInput);
		expect(actual.result).toBe("pass");
		expect(actual.commands).toHaveLength(9);
		expect(
			actual.commands.every(
				(command) =>
					command.exitCode === 0 &&
					command.filesystemDelta === 0 &&
					command.gitStatusDelta === 0,
			),
		).toBe(true);
		expect(
			actual.commands.filter((command) => command.format === "json"),
		).toHaveLength(2);
		expect(new Set(actual.commands.map((command) => command.cwd))).toEqual(
			new Set(["repository-root", "governed-package", "safe-nested-directory"]),
		);
		expect(actual.failurePath).toEqual({
			family: "kernel",
			error: "unsupported-output-format",
			exitCode: 40,
			filesystemDelta: 0,
			gitStatusDelta: 0,
		});
		expect(actual.dirtyFixture).toEqual({
			family: "kernel",
			exitCode: 0,
			filesystemDelta: 0,
			gitStatusDelta: 0,
			dirtyFilePreserved: true,
		});
	});
});
