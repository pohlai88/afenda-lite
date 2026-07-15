"use client";

import {
	closestCenter,
	DndContext,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, ShuffleIcon, Trash2Icon } from "lucide-react";

import { useCompose } from "@/features/playground/compose/compose-context";
import type { StageItem } from "@/features/playground/compose/stage-types";
import { getLabById } from "@/features/playground/lab-registry";

function SortableStackRow({ item }: { item: StageItem }) {
	const {
		actions: { canShuffle, shuffleItem, removeItem },
	} = useCompose();
	const lab = getLabById(item.labId);
	const shuffleEnabled = canShuffle(item.labId);
	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id: item.instanceId });

	return (
		<li
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
			}}
			className="flex items-center gap-2 rounded-md border bg-card px-2 py-2 text-sm"
		>
			<button
				type="button"
				className="cursor-grab touch-none text-muted-foreground"
				aria-label={`Reorder ${lab?.title ?? item.labId}`}
				{...attributes}
				{...listeners}
			>
				<GripVerticalIcon className="size-4" />
			</button>
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium">{lab?.title ?? item.labId}</p>
				<p className="truncate text-xs text-muted-foreground">
					{lab?.mount ?? "unknown"} · {item.labId}
				</p>
			</div>
			{shuffleEnabled ? (
				<button
					type="button"
					className="rounded p-1 text-muted-foreground hover:bg-muted"
					aria-label="Shuffle to another lab in the same category"
					onClick={() => shuffleItem(item.instanceId)}
				>
					<ShuffleIcon className="size-4" />
				</button>
			) : null}
			<button
				type="button"
				className="rounded p-1 text-destructive hover:bg-destructive/10"
				aria-label={`Remove ${lab?.title ?? item.labId}`}
				onClick={() => removeItem(item.instanceId)}
			>
				<Trash2Icon className="size-4" />
			</button>
		</li>
	);
}

export function ComposeStack() {
	const {
		state: { stage, ui },
		actions: { reorder },
	} = useCompose();

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
	);

	return (
		<aside
			className="flex flex-col gap-3 border-l p-4"
			aria-label="Stage stack"
		>
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-medium">Stack</h2>
				<span className="text-xs text-muted-foreground">
					{stage.items.length} items
				</span>
			</div>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={reorder}
			>
				<SortableContext
					items={stage.items.map((item) => item.instanceId)}
					strategy={verticalListSortingStrategy}
				>
					<ul className="flex flex-col gap-2">
						{stage.items.map((item) => (
							<SortableStackRow key={item.instanceId} item={item} />
						))}
					</ul>
				</SortableContext>
			</DndContext>
			<p className="text-xs text-muted-foreground" role="status">
				{ui.status}
			</p>
		</aside>
	);
}
