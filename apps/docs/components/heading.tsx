"use client";
import { useTranslations } from "@fuma-translate/react";
import { useCopyButton } from "fumadocs-ui/utils/use-copy-button";
import { CopyCheckIcon, LinkIcon } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../lib/cn";
import { buttonVariants } from "./ui/button";

type Types = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
type HeadingProps = ComponentPropsWithoutRef<"h1"> & {
	as?: Types;
};

export function Heading({ as, ...props }: HeadingProps) {
	const As = as ?? "h1";
	const t = useTranslations({ note: "heading anchor" });
	const [isChecked, onCopy] = useCopyButton(() => {
		if (!props.id) {
			return;
		}

		const url = new URL(window.location.href);
		url.hash = props.id;
		return navigator.clipboard.writeText(url.href);
	});

	if (!props.id) {
		return <As {...props} />;
	}

	return (
		<As
			{...props}
			className={cn(
				"group/heading flex scroll-m-28 flex-row items-center gap-1",
				props.className,
			)}
		>
			<a data-card="" href={`#${props.id}`}>
				{props.children}
			</a>
			<button
				aria-label={t("Copy Anchor Link", { note: "aria-label" })}
				className={cn(
					buttonVariants({
						variant: "ghost",
						size: "icon-xs",
					}),
					"not-prose shrink-0 text-fd-muted-foreground opacity-0 transition-opacity group-hover/heading:opacity-100",
				)}
				onClick={onCopy}
				type="button"
			>
				{isChecked ? <CopyCheckIcon /> : <LinkIcon />}
			</button>
		</As>
	);
}
