"use client";

import { Button } from "@afenda/ui/components/button";
import Link from "next/link";
import { useState } from "react";

import {
	ComposeProvider,
	useCompose,
} from "@/features/playground/compose/compose-context";
import { buildAgentPrompt } from "@/features/playground/compose/copy-agent-prompt";
import { ComposePalette } from "@/features/playground/compose/palette-panel";
import { ComposeStack } from "@/features/playground/compose/stack-panel";
import { ComposeStage } from "@/features/playground/compose/stage-panel";
import type { PlaygroundLab } from "@/features/playground/lab-registry";

function CopyAgentPromptButton() {
	const {
		state: { stage },
		actions: { setStatus },
	} = useCompose();
	const [label, setLabel] = useState("Copy agent prompt");

	async function onCopy() {
		const text = buildAgentPrompt(stage);
		try {
			await navigator.clipboard.writeText(text);
			setLabel("Copied");
			setStatus("Agent prompt copied to clipboard.");
		} catch {
			setLabel("Copy failed");
			setStatus("Clipboard copy failed — select the prompt manually.");
		}
	}

	return (
		<Button size="sm" onClick={onCopy}>
			{label}
		</Button>
	);
}

function ComposeChrome() {
	const {
		actions: { clearStage },
	} = useCompose();

	return (
		<div className="flex min-h-dvh flex-col">
			<header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3">
				<div className="flex flex-col gap-1">
					<p className="text-xs text-muted-foreground">Playground · Compose</p>
					<h1 className="text-lg font-semibold tracking-tight">
						Studio-style board
					</h1>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Link
						href="/playground"
						prefetch={false}
						className="inline-flex h-8 items-center rounded-md border bg-background px-3 text-sm hover:bg-muted"
					>
						Hub
					</Link>
					<Button variant="outline" size="sm" onClick={clearStage}>
						Clear all
					</Button>
					<CopyAgentPromptButton />
				</div>
			</header>

			<div className="grid flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_260px]">
				<ComposePalette />
				<ComposeStage />
				<ComposeStack />
			</div>
		</div>
	);
}

export function ComposeBoard({ labs }: { labs: readonly PlaygroundLab[] }) {
	return (
		<ComposeProvider labs={labs}>
			<ComposeChrome />
		</ComposeProvider>
	);
}
