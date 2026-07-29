"use client";

import type * as React from "react";
import {
	type ComponentProps,
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useId,
	useMemo,
	useState,
} from "react";
import { cn } from "../lib/cn";
import * as Unstyled from "./ui/tabs";

type CollectionKey = string | symbol;

export interface TabsProps
	extends Omit<
		ComponentProps<typeof Unstyled.Tabs>,
		"value" | "onValueChange"
	> {
	/**
	 * Shortcut for `defaultValue` when `items` is provided.
	 *
	 * @defaultValue 0
	 */
	defaultIndex?: number;
	/**
	 * Use simple mode instead of advanced usage as documented in https://radix-ui.com/primitives/docs/components/tabs.
	 */
	items?: string[];

	/**
	 * Additional label in tabs list when `items` is provided.
	 */
	label?: ReactNode;
}

const TabsContext = createContext<{
	items?: string[];
	collection: CollectionKey[];
} | null>(null);

function useTabContext() {
	const ctx = useContext(TabsContext);
	if (!ctx) {
		throw new Error("You must wrap your component in <Tabs>");
	}
	return ctx;
}

export function TabsList(
	props: React.ComponentProps<typeof Unstyled.TabsList>,
) {
	return (
		<Unstyled.TabsList
			{...props}
			className={cn(
				"not-prose flex gap-3.5 overflow-x-auto px-4 text-fd-secondary-foreground",
				props.className,
			)}
		/>
	);
}

export function TabsTrigger(
	props: React.ComponentProps<typeof Unstyled.TabsTrigger>,
) {
	return (
		<Unstyled.TabsTrigger
			{...props}
			className={cn(
				"inline-flex items-center gap-2 whitespace-nowrap border-transparent border-b py-2 font-medium text-fd-muted-foreground text-sm transition-colors hover:text-fd-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-fd-primary data-[state=active]:text-fd-primary [&_svg]:size-4",
				props.className,
			)}
		/>
	);
}

export function Tabs({
	ref,
	className,
	items,
	label,
	defaultIndex = 0,
	defaultValue = items?.[defaultIndex]
		? escapeValue(items[defaultIndex])
		: undefined,
	...props
}: TabsProps) {
	const [value, setValue] = useState(defaultValue);
	const collection = useMemo<CollectionKey[]>(() => [], []);

	return (
		<Unstyled.Tabs
			className={cn(
				"my-4 flex flex-col overflow-hidden rounded-xl border bg-fd-secondary",
				className,
			)}
			ref={ref}
			{...(value === undefined ? {} : { value })}
			onValueChange={(v: string) => {
				if (items && !items.some((item) => escapeValue(item) === v)) {
					return;
				}
				setValue(v);
			}}
			{...props}
		>
			{items ? (
				<TabsList>
					{label ? (
						<span className="my-auto me-auto font-medium text-sm">{label}</span>
					) : null}
					{items.map((item) => (
						<TabsTrigger key={item} value={escapeValue(item)}>
							{item}
						</TabsTrigger>
					))}
				</TabsList>
			) : null}
			<TabsContext.Provider
				value={useMemo(
					() => ({ ...(items === undefined ? {} : { items }), collection }),
					[collection, items],
				)}
			>
				{props.children}
			</TabsContext.Provider>
		</Unstyled.Tabs>
	);
}

export interface TabProps
	extends Omit<ComponentProps<typeof Unstyled.TabsContent>, "value"> {
	/**
	 * Value of tab, detect from index if unspecified.
	 */
	value?: string;
}

export function Tab({ value, ...props }: TabProps) {
	const { items } = useTabContext();
	const collectionIndex = useCollectionIndex();
	const resolved = value ?? items?.at(collectionIndex);
	if (!resolved) {
		throw new Error(
			"Failed to resolve tab `value`, please pass a `value` prop to the Tab component.",
		);
	}

	return (
		<TabsContent value={escapeValue(resolved)} {...props}>
			{props.children}
		</TabsContent>
	);
}

export function TabsContent({
	value,
	className,
	...props
}: ComponentProps<typeof Unstyled.TabsContent>) {
	return (
		<Unstyled.TabsContent
			className={cn(
				"prose-no-margin rounded-xl bg-fd-background p-4 text-[0.9375rem] outline-none data-[state=inactive]:hidden [&>figure:only-child]:-m-4 [&>figure:only-child]:border-none",
				className,
			)}
			forceMount
			value={value}
			{...props}
		>
			{props.children}
		</Unstyled.TabsContent>
	);
}

/**
 * Inspired by Headless UI.
 *
 * Return the index of children, this is made possible by registering the order of render from children using React context.
 * This is supposed by work with pre-rendering & pure client-side rendering.
 */
function useCollectionIndex() {
	const key = useId();
	const { collection } = useTabContext();

	useEffect(
		() => () => {
			const idx = collection.indexOf(key);
			if (idx !== -1) {
				collection.splice(idx, 1);
			}
		},
		[key, collection],
	);

	if (!collection.includes(key)) {
		collection.push(key);
	}
	return collection.indexOf(key);
}

/**
 * only escape whitespaces in values in simple mode
 */
const WHITESPACE_PATTERN = /\s/;

function escapeValue(v: string): string {
	return v.toLowerCase().replace(WHITESPACE_PATTERN, "-");
}
