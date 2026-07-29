import type * as React from "react";
import { cn } from "../../lib/utils";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Empty } from "./empty";
import { Spinner } from "./spinner";

type AsyncStateProps =
	| { state: "loading"; label?: string; className?: string }
	| {
			state: "empty" | "filtered-empty";
			title: string;
			description?: string;
			action?: React.ReactNode;
			className?: string;
	  }
	| {
			state: "error";
			title?: string;
			description: string;
			action?: React.ReactNode;
			className?: string;
	  }
	| { state: "ready"; children: React.ReactNode; className?: string };

function AsyncState(props: AsyncStateProps) {
	switch (props.state) {
		case "loading":
			return (
				<div
					aria-live="polite"
					className={cn(
						"flex min-h-32 items-center justify-center",
						props.className,
					)}
				>
					<Spinner label={props.label ?? "Loading"} />
				</div>
			);
		case "empty":
		case "filtered-empty":
			return (
				<Empty
					title={props.title}
					{...(props.className === undefined
						? {}
						: { className: props.className })}
					{...(props.description === undefined
						? {}
						: { description: props.description })}
					{...(props.action === undefined ? {} : { action: props.action })}
				/>
			);
		case "error":
			return (
				<Alert variant="destructive" className={props.className}>
					<AlertTitle>{props.title ?? "Unable to load"}</AlertTitle>
					<AlertDescription>{props.description}</AlertDescription>
					{props.action ? <div className="mt-3">{props.action}</div> : null}
				</Alert>
			);
		case "ready":
			return <div className={props.className}>{props.children}</div>;
	}
}

export { AsyncState };
