"use client";

import { useCompose } from "@/features/playground/compose/compose-context";

export function ComposePalette() {
	const {
		state: { labs, ui },
		actions: { setQuery, addLab },
		meta: { searchInputRef },
	} = useCompose();

	const q = ui.query.trim().toLowerCase();
	const filteredLabs = q
		? labs.filter(
				(lab) =>
					lab.id.toLowerCase().includes(q) ||
					lab.title.toLowerCase().includes(q) ||
					lab.mount.toLowerCase().includes(q) ||
					lab.category.toLowerCase().includes(q),
			)
		: labs;

	return (
		<aside
			className="flex flex-col gap-3 border-r p-4"
			aria-label="Lab palette"
		>
			<label className="flex flex-col gap-1 text-sm">
				<span className="font-medium">Search labs</span>
				<input
					id="compose-lab-search"
					ref={searchInputRef}
					value={ui.query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="⌘K / Ctrl+K"
					className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-describedby="compose-search-hint"
				/>
			</label>
			<p id="compose-search-hint" className="text-xs text-muted-foreground">
				Ready labs only · grouped by mount
			</p>
			<ul className="flex flex-col gap-2">
				{filteredLabs.map((lab) => (
					<li key={lab.id}>
						<button
							type="button"
							className="w-full rounded-md border bg-card px-3 py-2 text-left text-sm hover:bg-accent"
							onClick={() => addLab(lab.id)}
							draggable
							onDragStart={(event) => {
								event.dataTransfer.setData("text/lab-id", lab.id);
							}}
						>
							<span className="font-medium">{lab.title}</span>
							<span className="mt-0.5 block text-xs text-muted-foreground">
								{lab.mount} · {lab.category} · click or drop
							</span>
						</button>
					</li>
				))}
			</ul>
		</aside>
	);
}
