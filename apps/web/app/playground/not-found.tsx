export default function PlaygroundNotFound() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-3 px-6 py-10">
			<p className="text-sm text-muted-foreground">Playground</p>
			<h1 className="text-xl font-semibold tracking-tight">Not found</h1>
			<p className="text-sm text-muted-foreground">
				That lab or path is not part of the local harness.
			</p>
			<a
				href="/playground"
				className="inline-flex h-9 w-fit items-center rounded-md border bg-background px-4 text-sm hover:bg-muted"
			>
				Back to hub
			</a>
		</main>
	);
}
