"use client";

import { ChevronRightIcon } from "lucide-react";
import {
	type ComponentProps,
	type MouseEvent,
	type ReactNode,
	useCallback,
	useState,
} from "react";
import { cn } from "../../lib/utils";

interface TreeNode {
	children?: readonly TreeNode[];
	disabled?: boolean;
	id: string;
	label: ReactNode;
}

interface TreeViewProps extends Omit<ComponentProps<"div">, "onSelect"> {
	expandedIds?: ReadonlySet<string>;
	nodes: readonly TreeNode[];
	onExpandedChange?: (ids: ReadonlySet<string>) => void;
	onSelect?: (node: TreeNode) => void;
	selectedId?: string;
}

function findTreeNode(
	items: readonly TreeNode[],
	id: string,
): TreeNode | undefined {
	for (const item of items) {
		if (item.id === id) {
			return item;
		}
		const child = findTreeNode(item.children ?? [], id);
		if (child !== undefined) {
			return child;
		}
	}
}

function TreeView({
	nodes,
	selectedId,
	expandedIds,
	onExpandedChange,
	onSelect,
	className,
	...props
}: TreeViewProps) {
	const [internalExpanded, setInternalExpanded] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const expanded = expandedIds ?? internalExpanded;
	const toggle = useCallback(
		(id: string) => {
			const next = new Set(expanded);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			if (!expandedIds) {
				setInternalExpanded(next);
			}
			onExpandedChange?.(next);
		},
		[expanded, expandedIds, onExpandedChange],
	);
	const handleToggle = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => toggle(event.currentTarget.value),
		[toggle],
	);
	const handleSelect = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			const node = findTreeNode(nodes, event.currentTarget.value);
			if (node !== undefined) {
				onSelect?.(node);
			}
		},
		[nodes, onSelect],
	);
	const renderNodes = (
		items: readonly TreeNode[],
		level: number,
	): ReactNode => (
		<ul
			className={cn(level > 1 && "ml-5 border-l pl-1")}
			role={level === 1 ? "tree" : "group"}
		>
			{items.map((node) => {
				const hasChildren = Boolean(node.children?.length);
				const isExpanded = expanded.has(node.id);
				return (
					<li
						aria-disabled={node.disabled}
						aria-expanded={hasChildren ? isExpanded : undefined}
						aria-level={level}
						aria-selected={selectedId === node.id}
						key={node.id}
						role="treeitem"
					>
						<div className="flex items-center gap-1">
							<button
								aria-label={
									isExpanded
										? `Collapse ${String(node.label)}`
										: `Expand ${String(node.label)}`
								}
								className={cn(
									"flex size-7 items-center justify-center rounded-sm text-muted-foreground",
									!hasChildren && "invisible",
								)}
								onClick={handleToggle}
								tabIndex={-1}
								type="button"
								value={node.id}
							>
								<ChevronRightIcon
									className={cn(
										"size-4 transition-transform",
										isExpanded && "rotate-90",
									)}
								/>
							</button>
							<button
								className={cn(
									"min-w-0 flex-1 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
									selectedId === node.id && "bg-accent text-accent-foreground",
								)}
								disabled={node.disabled}
								onClick={handleSelect}
								type="button"
								value={node.id}
							>
								{node.label}
							</button>
						</div>
						{hasChildren && isExpanded
							? renderNodes(node.children ?? [], level + 1)
							: null}
					</li>
				);
			})}
		</ul>
	);
	return (
		<div className={cn("rounded-lg border p-2", className)} {...props}>
			{renderNodes(nodes, 1)}
		</div>
	);
}

export { type TreeNode, TreeView };
