import { UI_SYSTEM_CATALOG } from "../src/metadata/catalog";
import { validateGovernance } from "../src/metadata/validate";

const governance = validateGovernance(UI_SYSTEM_CATALOG.components);

const report = {
	baseline: UI_SYSTEM_CATALOG.baseline,
	summary: {
		components: UI_SYSTEM_CATALOG.components.length,
		governedComponents: UI_SYSTEM_CATALOG.components.filter(
			(component) => component.governance?.contract,
		).length,
		componentLifecycle: Object.fromEntries(
			["candidate", "approved", "verified", "deprecated"].map((lifecycle) => [
				lifecycle,
				UI_SYSTEM_CATALOG.components.filter(
					(component) => component.lifecycle === lifecycle,
				).length,
			]),
		),
		capabilities: UI_SYSTEM_CATALOG.capabilities.length,
		surfaceProfiles: UI_SYSTEM_CATALOG.surfaceProfiles.length,
		erpModules: UI_SYSTEM_CATALOG.moduleCoverage.length,
		tokenFamilies: UI_SYSTEM_CATALOG.tokenFamilies.length,
	},
	governance: {
		ok: governance.ok,
		diagnostics: governance.diagnostics,
	},
	modules: UI_SYSTEM_CATALOG.moduleCoverage.map((coverage) => ({
		moduleId: coverage.moduleId,
		profiles: coverage.profiles,
		capabilities: [
			...new Set(
				coverage.profiles.flatMap(
					(profileId) =>
						UI_SYSTEM_CATALOG.surfaceProfiles.find(
							(profile) => profile.id === profileId,
						)?.capabilities ?? [],
				),
			),
		].sort(),
	})),
};

if (process.argv.includes("--json")) {
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
	process.stdout.write(
		[
			`${report.baseline.id} v${report.baseline.version} (${report.baseline.state})`,
			`${report.summary.components} components · ${report.summary.governedComponents} governed · ${report.summary.capabilities} capabilities · ${report.summary.surfaceProfiles} surface profiles`,
			`component lifecycle: ${Object.entries(report.summary.componentLifecycle)
				.map(([lifecycle, count]) => `${lifecycle}=${count}`)
				.join(" · ")}`,
			`governance: ${report.governance.ok ? "ok" : "failed"} (${report.governance.diagnostics.length} diagnostics)`,
			`${report.summary.erpModules} ERP modules · ${report.summary.tokenFamilies} token families`,
			...report.modules.map(
				(module) =>
					`${module.moduleId}: ${module.profiles.length} profiles / ${module.capabilities.length} capabilities`,
			),
			"",
		].join("\n"),
	);
}
