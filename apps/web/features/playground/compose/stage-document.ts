import { z } from "zod";

import {
	type ComposeStageDocument,
	createEmptyStage,
	STAGE_COLOR_MODES,
	STAGE_VIEWPORTS,
	type StageColorMode,
	type StageItem,
	type StageViewport,
} from "@/features/playground/compose/stage-types";
import { getLabById } from "@/features/playground/lab-registry";

function isStageViewport(value: unknown): value is StageViewport {
	return (
		typeof value === "string" &&
		(STAGE_VIEWPORTS as readonly string[]).includes(value)
	);
}

function isStageColorMode(value: unknown): value is StageColorMode {
	return (
		typeof value === "string" &&
		(STAGE_COLOR_MODES as readonly string[]).includes(value)
	);
}

const stageItemSchema = z.object({
	instanceId: z.string().min(1),
	labId: z.string().min(1),
});

const composeStageSchema = z.object({
	version: z.literal(1),
	items: z.array(stageItemSchema),
	inspector: z
		.object({
			sidebarOpen: z.boolean(),
			viewport: z.enum(STAGE_VIEWPORTS),
			mode: z.enum(STAGE_COLOR_MODES).optional(),
		})
		.passthrough(),
});

function uniqueInstanceIds(items: StageItem[]): StageItem[] {
	const seen = new Set<string>();
	const next: StageItem[] = [];
	for (const item of items) {
		if (seen.has(item.instanceId)) continue;
		seen.add(item.instanceId);
		next.push({ instanceId: item.instanceId, labId: item.labId });
	}
	return next;
}

/** Drop unknown labs and duplicate instance ids; fill inspector defaults. */
export function normalizeStageDocument(
	raw: ComposeStageDocument,
): ComposeStageDocument {
	const empty = createEmptyStage();
	return {
		version: 1,
		items: uniqueInstanceIds(raw.items).filter((item) =>
			Boolean(getLabById(item.labId)),
		),
		inspector: {
			sidebarOpen: Boolean(raw.inspector?.sidebarOpen),
			viewport: isStageViewport(raw.inspector?.viewport)
				? raw.inspector.viewport
				: empty.inspector.viewport,
			mode: isStageColorMode(raw.inspector?.mode)
				? raw.inspector.mode
				: empty.inspector.mode,
		},
	};
}

export function parseStageDocument(raw: unknown): ComposeStageDocument {
	const parsed = composeStageSchema.safeParse(raw);
	if (!parsed.success) {
		return createEmptyStage();
	}
	return normalizeStageDocument({
		version: 1,
		items: parsed.data.items,
		inspector: {
			sidebarOpen: parsed.data.inspector.sidebarOpen,
			viewport: parsed.data.inspector.viewport,
			mode: parsed.data.inspector.mode ?? "system",
		},
	});
}

export function serializeStageDocument(stage: ComposeStageDocument): string {
	return JSON.stringify(normalizeStageDocument(stage));
}

export function readStoredStage(storageKey: string): ComposeStageDocument {
	if (typeof window === "undefined") {
		return createEmptyStage();
	}
	try {
		const raw = sessionStorage.getItem(storageKey);
		if (!raw) return createEmptyStage();
		return parseStageDocument(JSON.parse(raw) as unknown);
	} catch {
		return createEmptyStage();
	}
}

export function writeStoredStage(
	storageKey: string,
	stage: ComposeStageDocument,
): void {
	if (typeof window === "undefined") return;
	sessionStorage.setItem(storageKey, serializeStageDocument(stage));
}
