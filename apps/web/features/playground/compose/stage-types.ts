export type StageViewport = "desktop" | "tablet" | "mobile";

export type StageColorMode = "light" | "dark" | "system";

export type StageItem = {
	instanceId: string;
	labId: string;
};

export type ComposeInspector = {
	sidebarOpen: boolean;
	viewport: StageViewport;
	mode: StageColorMode;
};

export type ComposeStageDocument = {
	version: 1;
	items: StageItem[];
	inspector: ComposeInspector;
};

export const COMPOSE_STORAGE_KEY = "afenda.playground.compose.v1";

export const STAGE_VIEWPORTS = [
	"desktop",
	"tablet",
	"mobile",
] as const satisfies readonly StageViewport[];

export const STAGE_COLOR_MODES = [
	"light",
	"dark",
	"system",
] as const satisfies readonly StageColorMode[];

export function createEmptyStage(): ComposeStageDocument {
	return {
		version: 1,
		items: [],
		inspector: {
			sidebarOpen: false,
			viewport: "desktop",
			mode: "system",
		},
	};
}

export function createStageInstanceId(): string {
	return `stage-${crypto.randomUUID()}`;
}

export function viewportClassName(viewport: StageViewport): string {
	if (viewport === "mobile") return "max-w-sm";
	if (viewport === "tablet") return "max-w-2xl";
	return "max-w-5xl";
}
