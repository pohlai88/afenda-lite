import { createStore } from "zustand/vanilla";

import type { Assignee, Task } from "../../contracts/applications/kanban-types";

const INITIAL_COLUMN_TITLES: Record<string, string> = {
	backlog: "Backlog",
	inProgress: "In Progress",
	done: "Done",
	review: "Review",
};

function generateId() {
	return Math.random().toString(36).slice(2, 9);
}

function isDuplicateColumnTitle(
	title: string,
	columnTitles: Record<string, string>,
	excludeColumnId?: string,
) {
	const normalized = title.trim().toLowerCase();

	return Object.entries(columnTitles).some(
		([id, existing]) =>
			id !== excludeColumnId && existing.trim().toLowerCase() === normalized,
	);
}

export function resolveAssignees(
	names: string[],
	candidates: Assignee[],
): Assignee[] {
	return names.map(
		(name) => candidates.find((member) => member.name === name) ?? { name },
	);
}

export interface KanbanState {
	columns: Record<string, Task[]>;
	columnTitles: Record<string, string>;

	// Drag-and-drop

	setColumns: (
		columns:
			| Record<string, Task[]>
			| ((prev: Record<string, Task[]>) => Record<string, Task[]>),
	) => void;

	// Column mutations
	addColumn: (title: string) => void;
	deleteColumn: (columnId: string) => void;
	updateColumnTitle: (columnId: string, title: string) => void;
	validateNewColumnTitle: (title: string) => string | undefined;

	// Card mutations
	addCard: (columnId: string, title: string) => void;
	deleteCard: (columnId: string, taskId: string) => void;
	updateCard: (
		columnId: string,
		taskId: string,
		updates: Partial<Task>,
	) => void;
}

export const createKanbanStore = (initialState: Partial<KanbanState> = {}) =>
	createStore<KanbanState>()((set, get) => ({
		columns: initialState.columns ?? {},
		columnTitles: initialState.columnTitles ?? {},

		...initialState,

		setColumns: (columns) =>
			set((state) => ({
				columns:
					typeof columns === "function" ? columns(state.columns) : columns,
			})),

		addColumn: (title) => {
			const trimmed = title.trim();
			const { columnTitles } = get();

			if (!trimmed || isDuplicateColumnTitle(trimmed, columnTitles)) return;

			const id =
				trimmed.toLowerCase().replace(/\s+/g, "-") + "-" + generateId();

			set((state) => ({
				columnTitles: { ...state.columnTitles, [id]: trimmed },
				columns: { ...state.columns, [id]: [] },
			}));
		},

		deleteColumn: (columnId) => {
			set((state) => {
				const columnTitles = { ...state.columnTitles };
				const columns = { ...state.columns };

				delete columnTitles[columnId];
				delete columns[columnId];

				return { columnTitles, columns };
			});
		},

		updateColumnTitle: (columnId, title) => {
			const trimmed = title.trim();
			const { columnTitles } = get();

			if (!trimmed || isDuplicateColumnTitle(trimmed, columnTitles, columnId))
				return;

			set((state) => ({
				columnTitles: { ...state.columnTitles, [columnId]: trimmed },
			}));
		},

		validateNewColumnTitle: (title) => {
			const { columnTitles } = get();

			if (isDuplicateColumnTitle(title, columnTitles)) {
				return "A column with this name already exists.";
			}

			return undefined;
		},

		addCard: (columnId, title) => {
			const newTask: Task = {
				id: generateId(),
				title,
				priority: "medium",
			};

			set((state) => ({
				columns: {
					...state.columns,
					[columnId]: [...(state.columns[columnId] ?? []), newTask],
				},
			}));
		},

		deleteCard: (columnId, taskId) => {
			set((state) => ({
				columns: {
					...state.columns,
					[columnId]: (state.columns[columnId] ?? []).filter(
						(t) => t.id !== taskId,
					),
				},
			}));
		},

		updateCard: (columnId, taskId, updates) => {
			set((state) => ({
				columns: {
					...state.columns,
					[columnId]: (state.columns[columnId] ?? []).map((t) =>
						t.id === taskId ? { ...t, ...updates } : t,
					),
				},
			}));
		},
	}));
