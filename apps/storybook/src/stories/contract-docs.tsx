import {
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import {
	Controls,
	Primary,
	Source,
	Stories,
	Unstyled,
} from "@storybook/addon-docs/blocks";
import type { ReactNode } from "react";
import type {
	StorybookContractEvidence,
	StorybookUsageRule,
} from "../../.storybook/storybook-evidence";

// Safari requires scrollable regions in the keyboard sequence. This is spread
// because Biome's generic non-interactive-tabindex rule cannot detect overflow.
const keyboardScrollableRegionProps = { tabIndex: 0 } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
	const id = `contract-${title.toLowerCase().replaceAll(" ", "-")}`;

	return (
		<section aria-labelledby={id} className="grid gap-4 border-t pt-6">
			<h2 className="font-medium text-lg" id={id}>
				{title}
			</h2>
			{children}
		</section>
	);
}

function ClauseList({ clauses }: { clauses: readonly string[] }) {
	return (
		<ul className="grid list-disc gap-2 pl-6">
			{clauses.map((clause) => (
				<li key={clause}>{clause}</li>
			))}
		</ul>
	);
}

function Ownership({
	ownership,
}: {
	ownership: StorybookContractEvidence["ownership"];
}) {
	return (
		<div className="grid gap-4 md:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle aria-level={3} role="heading">
						Component owns
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ClauseList clauses={ownership.componentOwns} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle aria-level={3} role="heading">
						Consumer owns
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ClauseList clauses={ownership.consumerOwns} />
				</CardContent>
			</Card>
		</div>
	);
}

function ApprovedApiTable({
	items,
	label,
}: {
	items: Readonly<Record<string, StorybookUsageRule>>;
	label: string;
}) {
	return (
		<section
			aria-label={label}
			className="afenda-contract-api-table overflow-x-auto rounded-md border"
			{...keyboardScrollableRegionProps}
		>
			<Table>
				<TableHeader className="bg-surface-sunken">
					<TableRow>
						<TableHead scope="col">Name</TableHead>
						<TableHead scope="col">Meaning</TableHead>
						<TableHead scope="col">Allowed when</TableHead>
						<TableHead scope="col">Not allowed when</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Object.entries(items).map(([name, rule]) => (
						<TableRow className="align-top" key={name}>
							<TableHead
								className="h-auto whitespace-normal py-2 align-top font-medium font-mono text-foreground"
								scope="row"
							>
								{name}
							</TableHead>
							<TableCell>{rule.meaning}</TableCell>
							<TableCell>
								<ClauseList clauses={rule.allowedWhen} />
							</TableCell>
							<TableCell>
								{rule.prohibitedWhen.length > 0 ? (
									<ClauseList clauses={rule.prohibitedWhen} />
								) : (
									<span className="text-foreground-tertiary">
										Not specified
									</span>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</section>
	);
}

/** Meta `parameters` factory for Storybook Docs (`parameters.docs.page`). */
export function contractDocsParameters(
	evidence: StorybookContractEvidence,
	title: string,
) {
	return {
		docs: {
			page: () => <ContractDocsPage evidence={evidence} title={title} />,
		},
	} as const;
}

export function ContractDocsPage({
	evidence,
	title,
}: {
	evidence: StorybookContractEvidence;
	title: string;
}) {
	const [primaryExport, ...relatedExports] = evidence.publicExports;
	const publicImport = `import { ${primaryExport} } from "@afenda/ui-system";`;
	const hasVariants = Object.keys(evidence.approvedVariants).length > 0;
	const hasSizes = Object.keys(evidence.approvedSizes).length > 0;

	return (
		<Unstyled>
			<main className="afenda-contract-docs grid gap-6 font-sans text-foreground text-sm">
				<header className="grid gap-4">
					<h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
					<div className="grid gap-4 rounded-md border bg-surface-sunken p-4">
						<p className="font-medium text-foreground text-lg">
							{evidence.purpose}
						</p>
						<ul
							aria-label="Contract classification"
							className="flex flex-wrap gap-2"
						>
							{[evidence.family, evidence.layer, evidence.qualityProfile].map(
								(classification) => (
									<li key={classification}>
										<Badge variant="outline">{classification}</Badge>
									</li>
								),
							)}
						</ul>
						<p className="font-mono text-foreground-tertiary text-xs">
							{evidence.contractId} · {evidence.componentId}
						</p>
					</div>
				</header>

				<Section title="Public API">
					<p className="text-foreground-secondary">
						Import the primary component from the governed package barrel.
					</p>
					<Source code={publicImport} language="tsx" />
					{relatedExports.length > 0 ? (
						<div className="grid gap-2">
							<h3 className="font-medium">Related public exports</h3>
							<ul className="flex flex-wrap gap-2">
								{relatedExports.map((exportName) => (
									<li key={exportName}>
										<Badge variant="outline">{exportName}</Badge>
									</li>
								))}
							</ul>
						</div>
					) : null}
				</Section>

				<Section title="Ownership">
					<Ownership ownership={evidence.ownership} />
				</Section>
				<Section title="Semantic boundaries">
					<ClauseList clauses={evidence.semanticBoundaries} />
				</Section>
				{hasVariants ? (
					<Section title="Approved variants">
						<ApprovedApiTable
							items={evidence.approvedVariants}
							label={`${title} approved variants`}
						/>
					</Section>
				) : null}
				{hasSizes ? (
					<Section title="Approved sizes">
						<ApprovedApiTable
							items={evidence.approvedSizes}
							label={`${title} approved sizes`}
						/>
					</Section>
				) : null}
				<Section title="Required states">
					<p className="text-foreground-secondary">
						Evidence stories must visibly represent these catalogue-required
						states.
					</p>
					<ul aria-label="Required states" className="flex flex-wrap gap-2">
						{evidence.requiredStates.map((state) => (
							<li key={state}>
								<Badge variant="outline">{state}</Badge>
							</li>
						))}
					</ul>
				</Section>
				<Section title="Usage rules">
					<ClauseList clauses={evidence.rules} />
				</Section>
				<Section title="Accessibility">
					<ClauseList clauses={evidence.accessibility} />
				</Section>
				<Section title="Prohibited usage">
					<div className="rounded-md border border-destructive-border bg-destructive-subtle p-4 text-destructive-subtle-foreground">
						<ClauseList clauses={evidence.prohibitedUsage} />
					</div>
				</Section>

				<Section title="Interactive API">
					<Primary />
					<Controls />
				</Section>
				<Stories includePrimary={false} title="Approved evidence stories" />
			</main>
		</Unstyled>
	);
}
