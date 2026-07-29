import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Separator,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import { StorySection } from "./evidence";

type ColorRole = Readonly<{
	name: string;
	background: `--${string}`;
	foreground: `--${string}`;
	border?: `--${string}`;
}>;

const foundationRoles = [
	{
		name: "Application canvas",
		background: "--canvas",
		foreground: "--foreground",
	},
	{
		name: "Workspace",
		background: "--background",
		foreground: "--foreground",
	},
	{
		name: "Raised card",
		background: "--card",
		foreground: "--card-foreground",
	},
	{
		name: "Primary action",
		background: "--primary",
		foreground: "--primary-foreground",
	},
	{
		name: "Secondary action",
		background: "--secondary",
		foreground: "--secondary-foreground",
	},
	{
		name: "Muted context",
		background: "--muted",
		foreground: "--muted-foreground",
	},
	{
		name: "Accent surface",
		background: "--accent",
		foreground: "--accent-foreground",
	},
] as const satisfies readonly ColorRole[];

const statusRoles = [
	{
		name: "Successful outcome",
		background: "--success-subtle",
		foreground: "--success-subtle-foreground",
		border: "--success-border",
	},
	{
		name: "Attention required",
		background: "--warning-subtle",
		foreground: "--warning-subtle-foreground",
		border: "--warning-border",
	},
	{
		name: "Informational state",
		background: "--info-subtle",
		foreground: "--info-subtle-foreground",
		border: "--info-border",
	},
	{
		name: "Destructive outcome",
		background: "--destructive-subtle",
		foreground: "--destructive-subtle-foreground",
		border: "--destructive-border",
	},
] as const satisfies readonly ColorRole[];

const surfaceRoles = [
	{
		name: "Sunken workspace",
		background: "--surface-sunken",
		foreground: "--foreground",
	},
	{
		name: "Raised workspace",
		background: "--surface-raised",
		foreground: "--foreground",
	},
	{
		name: "Table row hover",
		background: "--table-row-hover",
		foreground: "--foreground",
	},
	{
		name: "Control fill",
		background: "--control-fill",
		foreground: "--foreground",
	},
] as const satisfies readonly ColorRole[];

const chartTokens = [
	"--chart-1",
	"--chart-2",
	"--chart-3",
	"--chart-4",
	"--chart-5",
] as const;

const sizeTokens = [
	{ name: "Compact control", token: "--control-height-sm" },
	{ name: "Control", token: "--control-height" },
	{ name: "Compact table row", token: "--table-row-height-compact" },
	{ name: "Table row", token: "--table-row-height" },
] as const;

const shadowTokens: readonly Readonly<{
	name: string;
	shadow: `--${string}`;
	radius: `--${string}`;
}>[] = [
	{ name: "Raised", shadow: "--shadow-raised", radius: "--radius-md" },
	{ name: "Overlay", shadow: "--shadow-overlay", radius: "--radius-lg" },
	{ name: "Dialog", shadow: "--shadow-dialog", radius: "--radius-xl" },
];

const durationTokens: readonly `--${string}`[] = [
	"--duration-fast",
	"--duration-normal",
	"--duration-slow",
];

function variable(name: `--${string}`): string {
	return `var(${name})`;
}

function ColorGrid({ roles }: { roles: readonly ColorRole[] }) {
	return (
		<ul className="grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
			{roles.map((role) => (
				<li
					className="min-h-28 rounded-lg border p-4"
					key={role.background}
					style={
						{
							backgroundColor: variable(role.background),
							borderColor: role.border
								? variable(role.border)
								: "var(--border)",
							color: variable(role.foreground),
						} satisfies CSSProperties
					}
				>
					<p
						className={
							role.foreground === "--muted-foreground"
								? "text-xl font-bold"
								: "font-semibold"
						}
					>
						{role.name}
					</p>
					<code
						className="mt-5 block text-xs"
						style={
							role.foreground === "--muted-foreground"
								? { color: "var(--foreground)" }
								: undefined
						}
					>
						{role.background}
					</code>
					<code
						className="block text-xs"
						style={
							role.foreground === "--muted-foreground"
								? { color: "var(--foreground)" }
								: undefined
						}
					>
						{role.foreground}
					</code>
					{role.border ? (
						<code className="block text-xs">{role.border}</code>
					) : null}
				</li>
			))}
		</ul>
	);
}

type WorkbenchSectionProps = Readonly<{
	id: string;
	title: string;
	description: string;
	children: ReactNode;
}>;

function WorkbenchSection({
	id,
	title,
	description,
	children,
}: WorkbenchSectionProps) {
	return (
		<section className="grid gap-4" aria-labelledby={id}>
			<div className="grid gap-1">
				<h2
					className="text-base font-semibold tracking-tight text-foreground"
					id={id}
				>
					{title}
				</h2>
				<p className="max-w-5xl text-sm leading-5 text-foreground-secondary">
					{description}
				</p>
			</div>
			{children}
		</section>
	);
}

function TokensOverview() {
	return (
		<main
			className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:px-8"
			aria-labelledby="token-page-title"
		>
			<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
				<div className="grid gap-2">
					<p className="text-sm font-medium text-foreground-secondary">
						Afenda UI foundation
					</p>
					<div className="grid gap-1">
						<h1
							className="text-2xl font-semibold tracking-tight"
							id="token-page-title"
						>
							Semantic design tokens
						</h1>
						<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
							Every sample resolves the active CSS custom property from
							tokens.css. Switch the Storybook theme to verify the governed
							light and dark values. Prefer semantic roles over inventing
							feature-owned hex.
						</p>
					</div>
				</div>
				<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
					<div className="grid gap-1">
						<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
							Theme source
						</dt>
						<dd className="text-sm">tokens.css</dd>
					</div>
					<div className="grid gap-1">
						<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
							Verification
						</dt>
						<dd className="text-sm">Light and dark</dd>
					</div>
					<div className="grid gap-1">
						<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
							Scope
						</dt>
						<dd className="text-sm">Foundation roles</dd>
					</div>
					<div className="grid gap-1">
						<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
							Use
						</dt>
						<dd className="text-sm">Semantic components</dd>
					</div>
				</dl>
			</header>

			<Separator />

			<WorkbenchSection
				id="foundation-roles"
				title="Foundation roles"
				description="Neutral surfaces and action emphasis used across standard component composition."
			>
				<ColorGrid roles={foundationRoles} />
			</WorkbenchSection>

			<WorkbenchSection
				id="status-roles"
				title="ERP status roles"
				description="Complete background, readable foreground, and border triplets for lifecycle and outcome communication."
			>
				<ColorGrid roles={statusRoles} />
			</WorkbenchSection>

			<WorkbenchSection
				id="business-surfaces"
				title="Business surfaces"
				description="Workspace depth, collection rows, and control affordances without feature-owned color invention."
			>
				<ColorGrid roles={surfaceRoles} />
			</WorkbenchSection>

			<WorkbenchSection
				id="chart-sequence"
				title="Chart sequence"
				description="Ordered categorical accents; chart meaning and accessible labels remain consumer-owned."
			>
				<ol className="grid list-none grid-cols-5 gap-2 p-0">
					{chartTokens.map((token, index) => (
						<li className="space-y-2 text-center" key={token}>
							<div
								className="h-20 rounded-md border"
								style={{ backgroundColor: variable(token) }}
								aria-hidden="true"
							/>
							<span className="block text-xs font-medium">
								Series {index + 1}
							</span>
							<code className="block text-[0.6875rem] text-foreground-secondary">
								{token}
							</code>
						</li>
					))}
				</ol>
			</WorkbenchSection>

			<WorkbenchSection
				id="density-and-elevation"
				title="Density and elevation"
				description="Shared control rhythm, table density, radius, and elevation primitives."
			>
				<div className="grid gap-4 lg:grid-cols-2">
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Governed heights</CardTitle>
							<CardDescription>
								Rendered at the actual custom-property height.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{sizeTokens.map(({ name, token }) => (
								<div
									className="flex items-center justify-between rounded-md border bg-control-fill px-3"
									key={token}
									style={{ height: variable(token) }}
								>
									<span className="text-sm font-medium">{name}</span>
									<code className="text-xs text-foreground-secondary">
										{token}
									</code>
								</div>
							))}
						</CardContent>
					</Card>

					<div className="grid gap-4 sm:grid-cols-3">
						{shadowTokens.map(({ name, shadow, radius }) => (
							<div
								className="flex min-h-36 flex-col justify-between bg-card p-4 text-card-foreground"
								key={shadow}
								style={{
									borderRadius: variable(radius),
									boxShadow: variable(shadow),
								}}
							>
								<span className="font-semibold">{name}</span>
								<div>
									<code className="block text-xs">{shadow}</code>
									<code className="block text-xs">{radius}</code>
								</div>
							</div>
						))}
					</div>
				</div>
			</WorkbenchSection>

			<WorkbenchSection
				id="motion"
				title="Motion"
				description="Hover the track to compare governed durations using the standard easing curve."
			>
				<div className="space-y-3">
					{durationTokens.map((duration) => (
						<div
							className="group rounded-md border bg-surface-sunken p-3"
							key={duration}
						>
							<div className="mb-2 flex justify-between gap-4 text-xs">
								<code>{duration}</code>
								<code>--ease-standard</code>
							</div>
							<div
								className="size-4 rounded-full bg-primary group-hover:translate-x-[min(70vw,48rem)]"
								style={{
									transitionDuration: variable(duration),
									transitionTimingFunction: "var(--ease-standard)",
								}}
							/>
						</div>
					))}
				</div>
			</WorkbenchSection>
		</main>
	);
}

const meta = {
	title: "UI System/Tokens",
	component: TokensOverview,
	tags: ["autodocs", "test"],
	parameters: {
		docs: {
			description: {
				component:
					"Visual evidence for the semantic color, density, elevation, radius, and motion roles owned by the UI-system public stylesheet. Foundation suite — not a component contract surface.",
			},
		},
	},
} satisfies Meta<typeof TokensOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		docs: {
			description: {
				story:
					"One foundation workbench: semantic token roles resolve from tokens.css. Switch Storybook theme to verify light and dark governed values.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<TokensOverview />
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Maps token families to ERP meaning: foundation surfaces, status triplets, and business depth — without inventing feature hex.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-8">
			<StorySection title="Foundation · canvas and card">
				<ColorGrid roles={foundationRoles.slice(0, 3)} />
			</StorySection>
			<StorySection title="Status · outcome triplets">
				<ColorGrid roles={statusRoles} />
			</StorySection>
			<StorySection title="Business surfaces">
				<ColorGrid roles={surfaceRoles} />
			</StorySection>
		</div>
	),
};

export const ControlledUsage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Consume tokens via CSS variables or Tailwind semantic utilities from the UI-system stylesheet — never hardcode parallel hex in features.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-3">
			<div
				className="rounded-lg border p-4"
				style={{
					backgroundColor: "var(--card)",
					color: "var(--card-foreground)",
					borderColor: "var(--border)",
				}}
			>
				<p className="font-medium">Raised card sample</p>
				<code className="mt-2 block text-xs text-foreground-secondary">
					var(--card) · var(--card-foreground)
				</code>
			</div>
			<p className="text-sm text-foreground-secondary">
				Prefer `bg-card`, `text-foreground-secondary`, and status utilities from
				`@afenda/ui-system` styles.
			</p>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Status roles ship background, foreground, and border together so severity is not color-only. Verify contrast in both themes.",
			},
		},
	},
	render: () => <ColorGrid roles={statusRoles} />,
};

export const VariantsAndSizes: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Density inventory: control and table heights, elevation/radius pairs, and motion durations — not decorative one-offs.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<div className="grid gap-2">
				<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
					Heights
				</p>
				{sizeTokens.map(({ name, token }) => (
					<div
						className="flex items-center justify-between rounded-md border bg-control-fill px-3"
						key={token}
						style={{ height: variable(token) }}
					>
						<span className="text-sm font-medium">{name}</span>
						<code className="text-xs text-foreground-secondary">{token}</code>
					</div>
				))}
			</div>
			<div className="grid gap-2">
				<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
					Motion
				</p>
				{durationTokens.map((duration) => (
					<code key={duration} className="text-sm">
						{duration}
					</code>
				))}
			</div>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Compose token-backed Card chrome with Badge taxonomy and StatusBadge lifecycle — tokens stay in the stylesheet, meaning stays on components.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-md shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="grid gap-1">
						<CardTitle>Token-backed surface</CardTitle>
						<CardDescription>bg-card · border · foreground</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Foundation</Badge>
						<StatusBadge status="success" label="Contrast ready" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="text-sm text-foreground-secondary">
				StatusBadge consumes status tokens. Do not invent a parallel success hex
				in feature CSS.
			</CardContent>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Do consume semantic roles from tokens.css. Do not invent feature-owned hex or drop status foreground/border pairs.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: semantic status triplet">
				<div
					className="rounded-lg border p-4"
					style={{
						backgroundColor: "var(--success-subtle)",
						color: "var(--success-subtle-foreground)",
						borderColor: "var(--success-border)",
					}}
				>
					<p className="font-medium">Posted batch ready</p>
					<code className="mt-2 block text-xs">
						--success-subtle · foreground · border
					</code>
				</div>
			</StorySection>
			<StorySection title="Do not: invent feature hex">
				<p className="text-sm text-foreground-secondary">
					Do not hardcode `#22c55e` in product CSS, or use background-only color
					to mean success without a readable foreground pair.
				</p>
			</StorySection>
		</div>
	),
};
