import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Separator,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";

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
					<p className="font-semibold">{role.name}</p>
					<code className="mt-5 block text-xs">{role.background}</code>
					<code className="block text-xs">{role.foreground}</code>
					{role.border ? (
						<code className="block text-xs">{role.border}</code>
					) : null}
				</li>
			))}
		</ul>
	);
}

function TokenSection({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<section
			className="space-y-4"
			aria-labelledby={`tokens-${title.toLowerCase().replaceAll(" ", "-")}`}
		>
			<div>
				<h2
					className="text-lg font-medium"
					id={`tokens-${title.toLowerCase().replaceAll(" ", "-")}`}
				>
					{title}
				</h2>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
			{children}
		</section>
	);
}

function TokensOverview() {
	return (
		<main
			className="mx-auto w-full max-w-6xl space-y-8"
			aria-labelledby="token-page-title"
		>
			<header className="space-y-2">
				<p className="text-sm font-medium text-muted-foreground">
					Afenda UI foundation
				</p>
				<h1
					className="text-2xl font-semibold tracking-tight"
					id="token-page-title"
				>
					Semantic design tokens
				</h1>
				<p className="max-w-3xl text-sm text-muted-foreground">
					Every sample resolves the active CSS custom property from tokens.css.
					Switch the Storybook theme to verify the governed light and dark
					values.
				</p>
			</header>

			<Separator />

			<TokenSection
				title="Foundation roles"
				description="Neutral surfaces and action emphasis used across standard component composition."
			>
				<ColorGrid roles={foundationRoles} />
			</TokenSection>

			<TokenSection
				title="ERP status roles"
				description="Complete background, readable foreground, and border triplets for lifecycle and outcome communication."
			>
				<ColorGrid roles={statusRoles} />
			</TokenSection>

			<TokenSection
				title="Business surfaces"
				description="Workspace depth, collection rows, and control affordances without feature-owned color invention."
			>
				<ColorGrid roles={surfaceRoles} />
			</TokenSection>

			<TokenSection
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
							<code className="block text-[0.6875rem] text-muted-foreground">
								{token}
							</code>
						</li>
					))}
				</ol>
			</TokenSection>

			<TokenSection
				title="Density and elevation"
				description="Shared control rhythm, table density, radius, and elevation primitives."
			>
				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
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
									<code className="text-xs text-muted-foreground">{token}</code>
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
			</TokenSection>

			<TokenSection
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
			</TokenSection>
		</main>
	);
}

const meta = {
	title: "UI System/Foundation/Tokens",
	component: TokensOverview,
	tags: ["autodocs", "test"],
	parameters: {
		docs: {
			description: {
				component:
					"Visual evidence for the semantic color, density, elevation, radius, and motion roles owned by the UI-system public stylesheet.",
			},
		},
	},
} satisfies Meta<typeof TokensOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
