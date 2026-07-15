"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useTheme } from "next-themes";
import {
	createContext,
	type ReactNode,
	use,
	useEffect,
	useRef,
	useState,
} from "react";

import {
	readStoredStage,
	writeStoredStage,
} from "@/features/playground/compose/stage-document";
import {
	COMPOSE_STORAGE_KEY,
	type ComposeStageDocument,
	createEmptyStage,
	createStageInstanceId,
	type StageColorMode,
	type StageViewport,
} from "@/features/playground/compose/stage-types";
import type { PlaygroundLab } from "@/features/playground/lab-registry";

function peersOf(
	labs: readonly PlaygroundLab[],
	labId: string,
): readonly PlaygroundLab[] {
	const current = labs.find((lab) => lab.id === labId);
	if (!current) return [];
	return labs.filter(
		(lab) =>
			lab.id !== current.id &&
			lab.mount === current.mount &&
			lab.category === current.category,
	);
}

type ComposeUiState = {
	query: string;
	status: string;
	hydrated: boolean;
};

type ComposeState = {
	stage: ComposeStageDocument;
	ui: ComposeUiState;
	labs: readonly PlaygroundLab[];
};

type ComposeActions = {
	setQuery: (query: string) => void;
	addLab: (labId: string) => void;
	removeItem: (instanceId: string) => void;
	clearStage: () => void;
	shuffleItem: (instanceId: string) => void;
	reorder: (event: DragEndEvent) => void;
	setViewport: (viewport: StageViewport) => void;
	setSidebarOpen: (open: boolean) => void;
	setColorMode: (mode: StageColorMode) => void;
	setStatus: (status: string) => void;
	canShuffle: (labId: string) => boolean;
};

type ComposeMeta = {
	searchInputRef: React.RefObject<HTMLInputElement | null>;
	focusSearch: () => void;
};

type ComposeContextValue = {
	state: ComposeState;
	actions: ComposeActions;
	meta: ComposeMeta;
};

const ComposeContext = createContext<ComposeContextValue | null>(null);

export function useCompose(): ComposeContextValue {
	const value = use(ComposeContext);
	if (!value) {
		throw new Error("Compose components require ComposeProvider");
	}
	return value;
}

function patchInspector(
	prev: ComposeStageDocument,
	patch: Partial<ComposeStageDocument["inspector"]>,
): ComposeStageDocument {
	return {
		...prev,
		inspector: { ...prev.inspector, ...patch },
	};
}

export function ComposeProvider({
	children,
	labs,
}: {
	children: ReactNode;
	labs: readonly PlaygroundLab[];
}) {
	const { setTheme } = useTheme();
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	const [stage, setStage] = useState<ComposeStageDocument>(createEmptyStage);
	const [ui, setUi] = useState<ComposeUiState>({
		query: "",
		status: "Compose board ready.",
		hydrated: false,
	});

	useEffect(() => {
		setStage(readStoredStage(COMPOSE_STORAGE_KEY));
		setUi((prev) => ({ ...prev, hydrated: true }));
	}, []);

	useEffect(() => {
		if (!ui.hydrated) return;
		writeStoredStage(COMPOSE_STORAGE_KEY, stage);
	}, [stage, ui.hydrated]);

	useEffect(() => {
		if (!ui.hydrated) return;
		setTheme(stage.inspector.mode);
	}, [stage.inspector.mode, ui.hydrated, setTheme]);

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				searchInputRef.current?.focus();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const actions: ComposeActions = {
		setQuery(query) {
			setUi((prev) => ({ ...prev, query }));
		},
		addLab(labId) {
			if (!labs.some((lab) => lab.id === labId)) {
				setUi((prev) => ({ ...prev, status: `Unknown lab: ${labId}` }));
				return;
			}
			setStage((prev) => ({
				...prev,
				items: [...prev.items, { instanceId: createStageInstanceId(), labId }],
			}));
			setUi((prev) => ({ ...prev, status: `Added ${labId} to stage.` }));
		},
		removeItem(instanceId) {
			setStage((prev) => ({
				...prev,
				items: prev.items.filter((item) => item.instanceId !== instanceId),
			}));
			setUi((prev) => ({ ...prev, status: "Removed stage item." }));
		},
		clearStage() {
			if (
				stage.items.length > 0 &&
				!window.confirm("Clear all labs from the compose stage?")
			) {
				return;
			}
			setStage((prev) => ({ ...prev, items: [] }));
			setUi((prev) => ({ ...prev, status: "Stage cleared." }));
		},
		shuffleItem(instanceId) {
			setStage((prev) => {
				const target = prev.items.find(
					(item) => item.instanceId === instanceId,
				);
				if (!target) return prev;
				const peers = peersOf(labs, target.labId);
				if (peers.length === 0) return prev;
				const nextLab = peers[Math.floor(Math.random() * peers.length)];
				if (!nextLab) return prev;
				return {
					...prev,
					items: prev.items.map((item) =>
						item.instanceId === instanceId
							? { ...item, labId: nextLab.id }
							: item,
					),
				};
			});
			setUi((prev) => ({
				...prev,
				status: "Shuffled stage item within category.",
			}));
		},
		reorder(event) {
			const { active, over } = event;
			if (!over || active.id === over.id) return;
			setStage((prev) => {
				const oldIndex = prev.items.findIndex(
					(item) => item.instanceId === active.id,
				);
				const newIndex = prev.items.findIndex(
					(item) => item.instanceId === over.id,
				);
				if (oldIndex < 0 || newIndex < 0) return prev;
				return {
					...prev,
					items: arrayMove(prev.items, oldIndex, newIndex),
				};
			});
		},
		setViewport(viewport) {
			setStage((prev) => patchInspector(prev, { viewport }));
		},
		setSidebarOpen(open) {
			setStage((prev) => patchInspector(prev, { sidebarOpen: open }));
		},
		setColorMode(mode) {
			setStage((prev) => patchInspector(prev, { mode }));
		},
		setStatus(status) {
			setUi((prev) => ({ ...prev, status }));
		},
		canShuffle(labId) {
			return peersOf(labs, labId).length > 0;
		},
	};

	return (
		<ComposeContext
			value={{
				state: { stage, ui, labs },
				actions,
				meta: {
					searchInputRef,
					focusSearch: () => searchInputRef.current?.focus(),
				},
			}}
		>
			{children}
		</ComposeContext>
	);
}
