import { UI_SYSTEM_CATALOG } from "../../../packages/surfaces/ui-system/src/metadata/catalog";
import { validateGovernance } from "../../../packages/surfaces/ui-system/src/metadata/validate";

const governance = validateGovernance(UI_SYSTEM_CATALOG.components);
if (!governance.ok) {
	throw new Error(
		`Cannot start Storybook with invalid UI governance:\n${governance.diagnostics
			.map((diagnostic) => `${diagnostic.component}: ${diagnostic.message}`)
			.join("\n")}`,
	);
}

function projectUsageRules(
	rules:
		| Readonly<
				Record<
					string,
					Readonly<{
						meaning: string;
						allowedWhen: readonly string[];
						prohibitedWhen?: readonly string[];
					}>
				>
		  >
		| undefined,
) {
	return Object.fromEntries(
		Object.entries(rules ?? {}).map(([name, rule]) => [
			name,
			{
				meaning: rule.meaning,
				allowedWhen: [...rule.allowedWhen],
				prohibitedWhen: [...(rule.prohibitedWhen ?? [])],
			},
		]),
	);
}

const evidence = Object.fromEntries(
	UI_SYSTEM_CATALOG.components
		.filter((component) => component.layer !== "foundation")
		.map((component) => {
			const contract = component.governance?.contract;
			const [qualityProfile] = component.qualityProfiles;
			if (
				!(contract && qualityProfile) ||
				component.publicExports.length === 0
			) {
				throw new Error(
					`Renderable component ${component.id} lacks complete Storybook contract evidence.`,
				);
			}

			return [
				component.id,
				{
					componentId: component.id,
					contractId: contract.id,
					publicExports: [...component.publicExports],
					purpose: contract.purpose,
					ownership: {
						componentOwns: [...contract.ownership.componentOwns],
						consumerOwns: [...contract.ownership.consumerOwns],
					},
					semanticBoundaries: [...contract.semanticBoundaries],
					approvedVariants: projectUsageRules(contract.approvedVariants),
					approvedSizes: projectUsageRules(contract.approvedSizes),
					rules: [...contract.rules],
					accessibility: [...contract.accessibility],
					prohibitedUsage: [...contract.prohibitedUsage],
					family: component.family,
					layer: component.layer,
					qualityProfile,
					variants: [...(component.variants ?? [])],
					sizes: [...(component.sizes ?? [])],
					requiredStates: [...component.requiredStates],
				},
			] as const;
		}),
);

process.stdout.write(JSON.stringify(evidence));
