"use client";

import { useTranslations } from "@fuma-translate/react";
import { cva } from "class-variance-authority";
import Link from "fumadocs-core/link";
import { ChevronDown } from "lucide-react";
import {
	type ComponentProps,
	type ReactNode,
	useEffect,
	useState,
} from "react";
import { cn } from "../lib/cn";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "./ui/collapsible";

export interface ParameterNode {
	description: ReactNode;
	name: string;
}

export interface TypeNode {
	default?: ReactNode;
	deprecated?: boolean;
	/**
	 * Additional description of the field
	 */
	description?: ReactNode;

	/**
	 * a list of parameters info if the type is a function.
	 */
	parameters?: ParameterNode[];

	required?: boolean;

	returns?: ReactNode;

	/**
	 * type signature (short)
	 */
	type: ReactNode;

	/**
	 * type signature (full)
	 */
	typeDescription?: ReactNode;

	/**
	 * Optional `href` for the type
	 */
	typeDescriptionLink?: string;
}

const fieldVariants = cva("not-prose pe-2 text-fd-muted-foreground");

export function TypeTable({
	id,
	type,
	className,
	...props
}: { type: Record<string, TypeNode> } & ComponentProps<"div">) {
	const t = useTranslations({ note: "type table" });

	return (
		<div
			className={cn(
				"@container my-6 flex flex-col overflow-hidden rounded-2xl border bg-fd-card p-1 text-fd-card-foreground text-sm",
				className,
			)}
			id={id}
			{...props}
		>
			<div className="not-prose flex items-center px-3 py-1 font-medium text-fd-muted-foreground">
				<p className="w-1/4">{t("Prop")}</p>
				<p className="@max-xl:hidden">{t("Type")}</p>
			</div>
			{Object.entries(type).map(([key, value]) => (
				<Item
					key={key}
					{...(id === undefined ? {} : { parentId: id })}
					item={value}
					name={key}
				/>
			))}
		</div>
	);
}

function Item({
	parentId,
	name,
	item: {
		parameters = [],
		description,
		required = false,
		deprecated,
		typeDescription,
		default: defaultValue,
		type,
		typeDescriptionLink,
		returns,
	},
}: {
	parentId?: string;
	name: string;
	item: TypeNode;
}) {
	const t = useTranslations({ note: "type table" });
	const [open, setOpen] = useState(false);
	const id = parentId ? `${parentId}-${name}` : undefined;

	useEffect(() => {
		const { hash } = window.location;
		if (!(id && hash)) {
			return;
		}
		if (`#${id}` === hash) {
			setOpen(true);
		}
	}, [id]);

	return (
		<Collapsible
			className={cn(
				"scroll-m-20 overflow-hidden rounded-xl border transition-all",
				open
					? "not-last:mb-2 bg-fd-background shadow-sm"
					: "border-transparent",
			)}
			id={id}
			onOpenChange={(v) => {
				if (v && id) {
					window.history.replaceState(null, "", `#${id}`);
				}
				setOpen(v);
			}}
			open={open}
		>
			<CollapsibleTrigger className="group not-prose relative flex w-full flex-row items-center px-3 py-2 text-start hover:bg-fd-accent">
				<code
					className={cn(
						"w-1/4 min-w-fit pe-2 font-medium font-mono text-fd-primary",
						deprecated && "text-fd-primary/50 line-through",
					)}
				>
					{name}
					{!required && "?"}
				</code>
				{typeDescriptionLink ? (
					<Link className="@max-xl:hidden underline" href={typeDescriptionLink}>
						{type}
					</Link>
				) : (
					<span className="@max-xl:hidden">{type}</span>
				)}
				<ChevronDown className="absolute end-2 size-4 text-fd-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="fd-scroll-container grid grid-cols-[1fr_3fr] gap-y-4 overflow-auto border-t p-3 text-sm">
					<div className="prose prose-no-margin col-span-full text-sm empty:hidden">
						{description}
					</div>
					{typeDescription ? (
						<>
							<p className={cn(fieldVariants())}>{t("Type")}</p>
							<p className="not-prose my-auto">{typeDescription}</p>
						</>
					) : null}
					{defaultValue ? (
						<>
							<p className={cn(fieldVariants())}>{t("Default")}</p>
							<p className="not-prose my-auto">{defaultValue}</p>
						</>
					) : null}
					{parameters.length > 0 && (
						<>
							<p className={cn(fieldVariants())}>{t("Parameters")}</p>
							<div className="flex flex-col gap-2">
								{parameters.map((param) => (
									<div
										className="inline-flex flex-wrap items-center gap-1"
										key={param.name}
									>
										<p className="not-prose text-nowrap font-medium">
											{param.name} -
										</p>
										<div className="prose prose-no-margin text-sm">
											{param.description}
										</div>
									</div>
								))}
							</div>
						</>
					)}
					{returns ? (
						<>
							<p className={cn(fieldVariants())}>{t("Returns")}</p>
							<div className="prose prose-no-margin my-auto text-sm">
								{returns}
							</div>
						</>
					) : null}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
