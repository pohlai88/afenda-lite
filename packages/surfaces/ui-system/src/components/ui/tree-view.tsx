"use client";

import { ChevronRightIcon } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";

interface TreeNode {
	id: string;
	label: React.ReactNode;
	children?: readonly TreeNode[];
	disabled?: boolean;
}

interface TreeViewProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
	nodes: readonly TreeNode[];
	selectedId?: string;
	expandedIds?: ReadonlySet<string>;
	onExpandedChange?: (ids: ReadonlySet<string>) => void;
	onSelect?: (node: TreeNode) => void;
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
	const [internalExpanded, setInternalExpanded] = React.useState<
		ReadonlySet<string>
	>(new Set());
	const expanded = expandedIds ?? internalExpanded;
	const toggle = (id: string) => {
		const next = new Set(expanded);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		if (!expandedIds) setInternalExpanded(next);
		onExpandedChange?.(next);
	};
	const renderNodes = (
		items: readonly TreeNode[],
		level: number,
	): React.ReactNode => (
		<ul
			role={level === 1 ? "tree" : "group"}
			className={cn(level > 1 && "ml-5 border-l pl-1")}
		>
			{items.map((node) => {
				const hasChildren = Boolean(node.children?.length);
				const isExpanded = expanded.has(node.id);
				return (
					<li
						key={node.id}
						role="treeitem"
						aria-level={level}
						aria-selected={selectedId === node.id}
						aria-expanded={hasChildren ? isExpanded : undefined}
						aria-disabled={node.disabled}
					>
						<div className="flex items-center gap-1">
							<button
								type="button"
								tabIndex={-1}
								className={cn(
									"flex size-7 items-center justify-center rounded-sm text-muted-foreground",
									!hasChildren && "invisible",
								)}
								onClick={() => toggle(node.id)}
								aria-label={
									isExpanded
										? `Collapse ${String(node.label)}`
										: `Expand ${String(node.label)}`
								}
							>
								<ChevronRightIcon
									className={cn(
										"size-4 transition-transform",
										isExpanded && "rotate-90",
									)}
								/>
							</button>
							<button
								type="button"
								disabled={node.disabled}
								onClick={() => onSelect?.(node)}
								className={cn(
									"min-w-0 flex-1 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
									selectedId === node.id && "bg-accent text-accent-foreground",
								)}
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
