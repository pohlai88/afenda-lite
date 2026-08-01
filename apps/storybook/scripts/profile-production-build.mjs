import { execFile, execFileSync, spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const repositoryRoot = path.resolve(packageRoot, "../..");
const evidenceRoot = path.join(packageRoot, "build-evidence");
const timeoutMs = 180_000;
const command = "pnpm --filter @afenda/storybook build";
const buildExecutable =
	process.platform === "win32"
		? (process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe")
		: "pnpm";
const buildArgs =
	process.platform === "win32"
		? ["/d", "/s", "/c", command]
		: ["--filter", "@afenda/storybook", "build"];
const whitespacePattern = /\s+/;
const chunkAssetPattern =
	/assets\/([^\s]+)[\s\S]{0,120}?\|\s+([\d,.]+) kB\s+│\s+gzip:\s+([\d,.]+) kB/g;

const phaseDefinitions = [
	["cleaning", /Cleaning outputDir/i],
	["loading", /Loading presets|Loading preview/i],
	["managerStart", /Building manager/i],
	["managerComplete", /Manager built/i],
	["previewStart", /Building preview/i],
	["transformComplete", /modules transformed/i],
	["bundleComplete", /built in (?:[\d.]+m )?[\d.]+s/i],
	["buildComplete", /Storybook build completed|build completed successfully/i],
];

function executeFile(file, fileArgs) {
	return new Promise((resolve, reject) => {
		execFile(file, fileArgs, { windowsHide: true }, (error, stdout) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(stdout.trim());
		});
	});
}

async function sampleWindowsProcessTree(rootProcessId) {
	const script = [
		`$rootProcessId = ${rootProcessId}`,
		"$processes = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId",
		"$ids = [System.Collections.Generic.HashSet[int]]::new()",
		"$null = $ids.Add($rootProcessId)",
		"do {",
		"  $added = $false",
		"  foreach ($process in $processes) {",
		"    if ($ids.Contains([int]$process.ParentProcessId) -and $ids.Add([int]$process.ProcessId)) { $added = $true }",
		"  }",
		"} while ($added)",
		"$total = 0",
		"foreach ($processIdValue in $ids) {",
		"  $item = Get-Process -Id $processIdValue -ErrorAction SilentlyContinue",
		"  if ($null -ne $item) { $total += $item.WorkingSet64 }",
		"}",
		"[Console]::Write($total)",
	].join("; ");
	const stdout = await executeFile("powershell.exe", [
		"-NoProfile",
		"-NonInteractive",
		"-Command",
		script,
	]);
	const bytes = Number(stdout);
	return Number.isFinite(bytes) ? bytes : null;
}

async function samplePosixProcessTree(rootProcessId) {
	const stdout = await executeFile("ps", ["-eo", "pid=,ppid=,rss="]);
	const rows = stdout
		.split("\n")
		.map((line) => line.trim().split(whitespacePattern).map(Number))
		.filter(([processId, parentProcessId, rss]) =>
			[processId, parentProcessId, rss].every(Number.isFinite),
		);
	const processIds = new Set([rootProcessId]);
	let changed = true;
	while (changed) {
		changed = false;
		for (const [processId, parentProcessId] of rows) {
			if (processIds.has(parentProcessId) && !processIds.has(processId)) {
				processIds.add(processId);
				changed = true;
			}
		}
	}
	return rows
		.filter(([processId]) => processIds.has(processId))
		.reduce((total, [, , rss]) => total + rss * 1024, 0);
}

function sampleProcessTree(rootProcessId) {
	return process.platform === "win32"
		? sampleWindowsProcessTree(rootProcessId)
		: samplePosixProcessTree(rootProcessId);
}

async function terminateProcessTree(child) {
	if (!child.pid) {
		return;
	}
	if (process.platform === "win32") {
		try {
			await executeFile("taskkill.exe", [
				"/PID",
				String(child.pid),
				"/T",
				"/F",
			]);
		} catch {
			// The build may have exited between the timeout and process-tree cleanup.
		}
		return;
	}
	child.kill("SIGTERM");
}

function phaseDurations(markers, durationMs) {
	const elapsed = (name) => markers[name]?.elapsedMs;
	const between = (start, end) => {
		const startMs = elapsed(start);
		const endMs = elapsed(end);
		return startMs === undefined || endMs === undefined
			? null
			: Math.max(0, endMs - startMs);
	};
	return {
		configurationMs: elapsed("previewStart") ?? null,
		managerMs: between("managerStart", "managerComplete"),
		previewMs: between("previewStart", "bundleComplete"),
		finalizationMs:
			elapsed("bundleComplete") === undefined
				? null
				: Math.max(0, durationMs - elapsed("bundleComplete")),
	};
}

function largestChunks(log) {
	return [...log.matchAll(chunkAssetPattern)]
		.map((match) => ({
			asset: match[1],
			sizeKb: Number(match[2].replaceAll(",", "")),
			gzipKb: Number(match[3].replaceAll(",", "")),
		}))
		.sort((left, right) => right.sizeKb - left.sizeKb)
		.slice(0, 5);
}

async function runBuild(runNumber) {
	const startedAt = new Date();
	const startedNs = process.hrtime.bigint();
	const output = [];
	const markers = {};
	let peakWorkingSetBytes = null;
	let memorySamplingError = null;
	let sampling = false;
	let timedOut = false;

	const child = spawn(buildExecutable, buildArgs, {
		cwd: repositoryRoot,
		env: { ...process.env, NODE_ENV: "production" },
		shell: false,
		windowsHide: true,
	});

	const observe = (chunk, stream) => {
		const elapsedMs = Number(process.hrtime.bigint() - startedNs) / 1_000_000;
		const clean = stripVTControlCharacters(chunk.toString()).trim();
		if (clean.length === 0) {
			return;
		}
		output.push(`[+${elapsedMs.toFixed(0)}ms] [${stream}]\n${clean}`);
		for (const [name, pattern] of phaseDefinitions) {
			if (!markers[name] && pattern.test(clean)) {
				markers[name] = {
					elapsedMs: Math.round(elapsedMs),
					text: clean.trim(),
				};
			}
		}
	};
	child.stdout.on("data", (chunk) => observe(chunk, "stdout"));
	child.stderr.on("data", (chunk) => observe(chunk, "stderr"));

	const sample = async () => {
		if (sampling || !child.pid) {
			return;
		}
		sampling = true;
		try {
			const bytes = await sampleProcessTree(child.pid);
			if (bytes !== null) {
				peakWorkingSetBytes = Math.max(peakWorkingSetBytes ?? 0, bytes);
			}
		} catch (error) {
			memorySamplingError ??=
				error instanceof Error ? error.message : String(error);
		} finally {
			sampling = false;
		}
	};
	await sample();
	const memoryTimer = setInterval(sample, 2000);

	const timeout = setTimeout(async () => {
		timedOut = true;
		await terminateProcessTree(child);
	}, timeoutMs);

	const result = await new Promise((resolve) => {
		child.once("error", (error) =>
			resolve({ exitCode: null, error: error.message }),
		);
		child.once("close", (exitCode, signal) =>
			resolve({ exitCode, signal, error: null }),
		);
	});
	clearTimeout(timeout);
	clearInterval(memoryTimer);
	while (sampling) {
		// biome-ignore lint/performance/noAwaitInLoops: wait for the final in-flight OS sample before persisting evidence.
		await new Promise((resolve) => setTimeout(resolve, 25));
	}

	const durationMs = Math.round(
		Number(process.hrtime.bigint() - startedNs) / 1_000_000,
	);
	const logFile = `run-${runNumber}.log`;
	const log = output.join("\n");
	await writeFile(path.join(evidenceRoot, logFile), log, "utf8");
	let classification = "failed";
	if (timedOut) {
		classification = "non-termination-timeout";
	} else if (result.exitCode === 0) {
		classification = "completed";
	}

	return {
		run: runNumber,
		startedAt: startedAt.toISOString(),
		durationMs,
		timeoutMs,
		classification,
		exitCode: result.exitCode,
		signal: result.signal ?? null,
		error: result.error,
		peakWorkingSetBytes,
		memorySamplingError,
		phaseMarkers: markers,
		phaseDurationsMs: phaseDurations(markers, durationMs),
		largestChunks: largestChunks(log),
		logFile,
	};
}

function slowestStage(buildRuns) {
	const totals = new Map();
	for (const run of buildRuns) {
		for (const [stage, duration] of Object.entries(run.phaseDurationsMs)) {
			if (duration !== null) {
				totals.set(stage, (totals.get(stage) ?? 0) + duration);
			}
		}
	}
	return (
		[...totals]
			.map(([stage, total]) => ({
				stage,
				averageMs: Math.round(total / buildRuns.length),
			}))
			.sort((left, right) => right.averageMs - left.averageMs)[0] ?? null
	);
}

await mkdir(evidenceRoot, { recursive: true });
const runs = [];
for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
	// Builds are intentionally serial so cache state and process-tree memory remain attributable.
	// biome-ignore lint/performance/noAwaitInLoops: this is a two-run repeatability experiment.
	runs.push(await runBuild(runNumber));
}

const evidence = {
	schema: "afenda.storybook-production-build-evidence/v1",
	command,
	platform: process.platform,
	nodeVersion: process.version,
	pnpmVersion: execFileSync(
		buildExecutable,
		process.platform === "win32"
			? ["/d", "/s", "/c", "pnpm --version"]
			: ["--version"],
		{
			encoding: "utf8",
			windowsHide: true,
		},
	).trim(),
	addonPolicy: {
		production: ["@storybook/addon-docs", "@storybook/addon-a11y"],
		excludedDevelopmentOnly: ["@storybook/addon-vitest"],
	},
	runs,
	analysis: {
		allRunsCompleted: runs.every((run) => run.classification === "completed"),
		durationDeltaMs: Math.abs(runs[0].durationMs - runs[1].durationMs),
		slowestStage: slowestStage(runs),
		largestChunks: runs[0].largestChunks,
		addonAssetObservation:
			runs[0].largestChunks.find(({ asset }) => asset.startsWith("axe-")) ??
			null,
	},
};

await writeFile(
	path.join(evidenceRoot, "production-build-profile.json"),
	`${JSON.stringify(evidence, null, "\t")}\n`,
	"utf8",
);

if (!evidence.analysis.allRunsCompleted) {
	throw new Error("Storybook production profiling did not complete twice.");
}

process.stdout.write(
	`Storybook production profiling complete: ${runs.map((run) => `${run.durationMs}ms`).join(", ")}\n`,
);
