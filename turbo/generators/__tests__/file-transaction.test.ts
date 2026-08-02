import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
	applyGeneratorFileTransaction,
	GENERATOR_FILE_TRANSACTION_SCHEMA,
	GeneratorFileTransactionError,
} from "../engine/file-transaction.ts";

const exists = async (path: string): Promise<boolean> => {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
};

describe("generator file transaction", () => {
	it("creates files and skips matching create-or-same files", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-file-transaction-"),
		);
		try {
			await writeFile(resolve(repositoryRoot, "same.txt"), "same\n", "utf8");
			const result = await applyGeneratorFileTransaction({
				repositoryRoot,
				writes: [
					{ path: "new.txt", contents: "new\n", policy: "create" },
					{
						path: "same.txt",
						contents: "same\n",
						policy: "create-or-same",
					},
				],
			});

			expect(result).toEqual({
				schema: GENERATOR_FILE_TRANSACTION_SCHEMA,
				filesWritten: ["new.txt"],
				skipped: ["same.txt"],
			});
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("replaces only when existing bytes match the expected snapshot", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-file-transaction-replace-"),
		);
		try {
			await writeFile(resolve(repositoryRoot, "package.json"), "{}\n", "utf8");
			const result = await applyGeneratorFileTransaction({
				repositoryRoot,
				writes: [
					{
						path: "package.json",
						contents: '{"exports":{}}\n',
						expectedExistingContents: "{}\n",
						policy: "replace-if-current",
					},
				],
			});

			expect(result.filesWritten).toEqual(["package.json"]);
			expect(
				await readFile(resolve(repositoryRoot, "package.json"), "utf8"),
			).toBe('{"exports":{}}\n');
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("rejects duplicate paths and conflicting existing files before writes", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-file-transaction-conflict-"),
		);
		try {
			await writeFile(
				resolve(repositoryRoot, "same.txt"),
				"different\n",
				"utf8",
			);
			await expect(
				applyGeneratorFileTransaction({
					repositoryRoot,
					writes: [
						{ path: "a.txt", contents: "a\n", policy: "create" },
						{ path: "a.txt", contents: "a\n", policy: "create" },
					],
				}),
			).rejects.toBeInstanceOf(GeneratorFileTransactionError);
			await expect(
				applyGeneratorFileTransaction({
					repositoryRoot,
					writes: [
						{
							path: "same.txt",
							contents: "same\n",
							policy: "create-or-same",
						},
					],
				}),
			).rejects.toBeInstanceOf(GeneratorFileTransactionError);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});

	it("rolls back created files after a write failure", async () => {
		const repositoryRoot = await mkdtemp(
			join(tmpdir(), "afenda-file-transaction-rollback-"),
		);
		try {
			await writeFile(resolve(repositoryRoot, "blocked"), "file\n", "utf8");
			await expect(
				applyGeneratorFileTransaction({
					repositoryRoot,
					writes: [
						{ path: "created.txt", contents: "created\n", policy: "create" },
						{
							path: "blocked/child.txt",
							contents: "cannot write\n",
							policy: "create",
						},
					],
				}),
			).rejects.toBeInstanceOf(GeneratorFileTransactionError);

			expect(await exists(resolve(repositoryRoot, "created.txt"))).toBe(false);
			expect(await readFile(resolve(repositoryRoot, "blocked"), "utf8")).toBe(
				"file\n",
			);
		} finally {
			await rm(repositoryRoot, { force: true, recursive: true });
		}
	});
});
