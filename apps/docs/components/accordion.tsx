"use client";

import { useTranslations } from "@fuma-translate/react";
import { useCopyButton } from "fumadocs-ui/utils/use-copy-button";
import { Check, LinkIcon } from "lucide-react";
import {
	type ComponentProps,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/merge-refs";
import {
	AccordionContent,
	AccordionHeader,
	AccordionItem,
	AccordionTrigger,
	Accordion as Root,
} from "./ui/accordion";
import { buttonVariants } from "./ui/button";

export function Accordions({
	type = "single",
	ref,
	className,
	defaultValue,
	...props
}: ComponentProps<typeof Root>) {
	const rootRef = useRef<HTMLDivElement>(null);
	const composedRef = mergeRefs(ref, rootRef);
	const [value, setValue] = useState<string | string[]>(() =>
		type === "single" ? (defaultValue ?? "") : (defaultValue ?? []),
	);

	useEffect(() => {
		const id = window.location.hash.slice(1);
		const element = rootRef.current;
		if (!element || id.length === 0) {
			return;
		}

		const selected = document.getElementById(id);
		if (!(selected && element.contains(selected))) {
			return;
		}
		const selectedValue = selected.getAttribute("data-accordion-value");

		if (selectedValue) {
			setValue((prev) =>
				typeof prev === "string" ? selectedValue : [selectedValue, ...prev],
			);
		}
	}, []);

	return (
		// @ts-expect-error -- Multiple types
		<Root
			className={cn(
				"divide-y divide-fd-border overflow-hidden rounded-lg border bg-fd-card",
				className,
			)}
			collapsible={type === "single" ? true : undefined}
			onValueChange={setValue}
			ref={composedRef}
			type={type}
			value={value}
			{...props}
		/>
	);
}

export function Accordion({
	title,
	id,
	value = String(title),
	children,
	...props
}: Omit<ComponentProps<typeof AccordionItem>, "value" | "title"> & {
	title: string | ReactNode;
	value?: string;
}) {
	return (
		<AccordionItem value={value} {...props}>
			<AccordionHeader data-accordion-value={value} id={id}>
				<AccordionTrigger>{title}</AccordionTrigger>
				{id ? <CopyButton id={id} /> : null}
			</AccordionHeader>
			<AccordionContent>
				<div className="prose-no-margin px-4 pb-2 text-[0.9375rem]">
					{children}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}

function CopyButton({ id }: { id: string }) {
	const t = useTranslations({ note: "accordion" });
	const [checked, onClick] = useCopyButton(() => {
		const url = new URL(window.location.href);
		url.hash = id;

		return navigator.clipboard.writeText(url.toString());
	});

	return (
		<button
			aria-label={t("Copy Link", { note: "aria-label" })}
			className={cn(
				buttonVariants({
					color: "ghost",
					className: "me-2 text-fd-muted-foreground",
				}),
			)}
			onClick={onClick}
			type="button"
		>
			{checked ? (
				<Check className="size-3.5" />
			) : (
				<LinkIcon className="size-3.5" />
			)}
		</button>
	);
}
