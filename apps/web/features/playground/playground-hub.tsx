import Link from "next/link";

import type { PlaygroundLab } from "@/features/playground/lab-registry";

type PlaygroundHubProps = {
	labs: readonly PlaygroundLab[];
};

export function PlaygroundHub({ labs }: PlaygroundHubProps) {
	return (
		<div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-10">
			<header className="flex flex-col gap-2">
				<p className="text-sm text-muted-foreground">Local harness</p>
				<h1 className="text-3xl font-semibold tracking-tight">Playground</h1>
				<p className="text-muted-foreground">
					Curated AdminCN interaction labs for vibe coding — not a component
					dump. Enable with{" "}
					<code className="text-foreground">PLAYGROUND_ENABLED=true</code>.
				</p>
			</header>

			<nav aria-label="Playground actions" className="flex flex-wrap gap-3">
				<Link
					href="/playground/compose"
					prefetch={false}
					className="inline-flex h-9 items-center rounded-md border bg-card px-4 text-sm font-medium hover:bg-accent"
				>
					Open compose board
				</Link>
			</nav>

			<section
				className="flex flex-col gap-3"
				aria-labelledby="ready-labs-heading"
			>
				<h2 id="ready-labs-heading" className="text-lg font-medium">
					Ready labs ({labs.length})
				</h2>
				<ul className="flex flex-col gap-3">
					{labs.map((lab) => (
						<li key={lab.id}>
							<Link
								href={`/playground/lab/${lab.id}`}
								prefetch={false}
								className="flex flex-col gap-1 rounded-lg border bg-card p-4 hover:bg-accent/40"
							>
								<span className="font-medium">{lab.title}</span>
								<span className="text-sm text-muted-foreground">
									{lab.description}
								</span>
								<span className="font-mono text-xs text-muted-foreground">
									{lab.mount} · {lab.category}
								</span>
							</Link>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
