"use client";
import {
	autoUpdate,
	flip,
	offset,
	shift,
	useFloating,
} from "@floating-ui/react-dom";
import { cva } from "class-variance-authority";
import { usePathname } from "fumadocs-core/framework";
import { CornerDownRightIcon, ThumbsDown, ThumbsUp } from "lucide-react";
import {
	type HTMLAttributes,
	type ReactNode,
	type SyntheticEvent,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
	useTransition,
} from "react";
import { z } from "zod/mini";
import { cn } from "../../lib/cn";
import { buttonVariants } from "../ui/button";
import { Collapsible, CollapsibleContent } from "../ui/collapsible";
import {
	type ActionResponse,
	actionResponse,
	type BlockFeedback,
	blockFeedback,
	type PageFeedback,
	pageFeedback,
} from "./schema";

const rateButtonVariants = cva(
	"inline-flex items-center gap-2 rounded-full border px-3 py-2 font-medium text-sm disabled:cursor-not-allowed [&_svg]:size-4",
	{
		variants: {
			active: {
				true: "bg-fd-accent text-fd-accent-foreground [&_svg]:fill-current",
				false: "text-fd-muted-foreground",
			},
		},
	},
);

const pageFeedbackResult = z.extend(pageFeedback, {
	response: actionResponse,
});

const blockFeedbackResult = z.extend(blockFeedback, {
	response: actionResponse,
});

function feedbackActionErrorMessage(_error: unknown): string {
	return "Failed to send feedback";
}

function FeedbackThanksActions({
	githubUrl,
	onSubmitAgain,
}: {
	githubUrl?: string;
	onSubmitAgain: () => void;
}) {
	return (
		<div className="flex flex-row items-center gap-2">
			{githubUrl ? (
				<a
					className={cn(
						buttonVariants({
							color: "primary",
						}),
						"text-xs",
					)}
					href={githubUrl}
					rel="noreferrer noopener"
					target="_blank"
				>
					View on GitHub
				</a>
			) : null}

			<button
				className={cn(
					buttonVariants({
						color: "secondary",
					}),
					"text-xs",
				)}
				onClick={onSubmitAgain}
				type="button"
			>
				Submit Again
			</button>
		</div>
	);
}

/**
 * A feedback component to be attached at the end of page
 */
export function Feedback({
	onSendAction,
}: {
	onSendAction: (feedback: PageFeedback) => Promise<ActionResponse>;
}) {
	const pathname = usePathname();
	const { previous, setPrevious } = useSubmissionStorage(pathname, (v) => {
		const result = pageFeedbackResult.safeParse(v);
		return result.success ? result.data : null;
	});
	const [opinion, setOpinion] = useState<"good" | "bad" | null>(null);
	const [message, setMessage] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function submit(e?: SyntheticEvent) {
		if (opinion === null) {
			return;
		}

		startTransition(async () => {
			const feedback: PageFeedback = {
				url: location.href,
				opinion,
				message,
			};

			try {
				setError(null);
				const response = await onSendAction(feedback);
				setPrevious({
					response,
					...feedback,
				});
				setMessage("");
				setOpinion(null);
			} catch (actionError) {
				setError(feedbackActionErrorMessage(actionError));
			}
		});

		e?.preventDefault();
	}

	const activeOpinion = previous?.opinion ?? opinion;

	return (
		<Collapsible
			className="border-y py-3"
			onOpenChange={(v) => {
				if (!v) {
					setOpinion(null);
				}
			}}
			open={opinion !== null || previous !== null}
		>
			<div className="flex flex-row items-center gap-2">
				<p className="pe-2 font-medium text-sm">How is this guide?</p>
				<button
					className={cn(
						rateButtonVariants({
							active: activeOpinion === "good",
						}),
					)}
					disabled={previous !== null}
					onClick={() => {
						setOpinion("good");
					}}
					type="button"
				>
					<ThumbsUp />
					Good
				</button>
				<button
					className={cn(
						rateButtonVariants({
							active: activeOpinion === "bad",
						}),
					)}
					disabled={previous !== null}
					onClick={() => {
						setOpinion("bad");
					}}
					type="button"
				>
					<ThumbsDown />
					Bad
				</button>
			</div>
			<CollapsibleContent className="mt-3">
				{previous ? (
					<div className="flex flex-col items-center gap-3 rounded-xl bg-fd-card px-3 py-6 text-center text-fd-muted-foreground text-sm">
						<p>Thank you for your feedback!</p>
						<FeedbackThanksActions
							{...(previous.response?.githubUrl === undefined
								? {}
								: { githubUrl: previous.response.githubUrl })}
							onSubmitAgain={() => {
								setOpinion(previous.opinion);
								setPrevious(null);
							}}
						/>
					</div>
				) : (
					<form className="flex flex-col gap-3" onSubmit={submit}>
						<textarea
							autoFocus
							className="resize-none rounded-lg border bg-fd-secondary p-3 text-fd-secondary-foreground placeholder:text-fd-muted-foreground focus-visible:outline-none"
							onChange={(e) => setMessage(e.target.value)}
							onKeyDown={(e) => {
								if (!e.shiftKey && e.key === "Enter") {
									submit(e);
								}
							}}
							placeholder="Leave your feedback..."
							required
							value={message}
						/>
						{error ? (
							<p
								className="text-red-600 text-sm dark:text-red-400"
								role="alert"
							>
								{error}
							</p>
						) : null}
						<button
							className={cn(buttonVariants({ color: "outline" }), "w-fit px-3")}
							disabled={isPending}
							type="submit"
						>
							Submit
						</button>
					</form>
				)}
			</CollapsibleContent>
		</Collapsible>
	);
}

export interface FeedbackTextProps {
	children?: ReactNode;
	onSendAction: (feedback: BlockFeedback) => Promise<ActionResponse>;
}

/**
 * A feedback component for each content block in page, should be used with `remark-feedback-block`.
 *
 * See https://fumadocs.dev/docs/integrations/feedback.
 */
export function FeedbackText({ onSendAction, children }: FeedbackTextProps) {
	const [popup, _setPopup] = useState<{
		mode: "tooltip" | "expanded";
		blockId: string;
		selection: string;
		range: Range;
	} | null>(null);

	const containerRef = useRef<HTMLDivElement>(null);
	const { refs, floatingStyles } = useFloating({
		open: popup !== null,
		placement: "bottom",
		middleware: [offset(6), flip(), shift({ padding: 8 })],
		whileElementsMounted: autoUpdate,
	});

	function expandPopup() {
		if (popup?.mode !== "tooltip") {
			return;
		}

		const highlight = new Highlight(popup.range);
		CSS.highlights.set("fd-feedback-text", highlight);

		_setPopup({ ...popup, mode: "expanded" });
	}

	function closePopup() {
		if (popup?.mode === "expanded") {
			CSS.highlights.delete("fd-feedback-text");
		}

		_setPopup(null);
	}

	const updateSelectionPopover = useEffectEvent(() => {
		if (popup && popup.mode === "expanded") {
			return;
		}

		const container = containerRef.current;
		const selection = window.getSelection();

		if (
			!(container && selection) ||
			selection.isCollapsed ||
			selection.rangeCount === 0
		) {
			closePopup();
			return;
		}

		const range = selection.getRangeAt(0).cloneRange();
		if (!container.contains(range.commonAncestorContainer)) {
			closePopup();
			return;
		}

		const selectionText = selection.toString().trim();
		// also prevent cross-paragraph selection
		if (selectionText.length === 0 || selectionText.includes("\n")) {
			closePopup();
			return;
		}

		const element =
			range.startContainer instanceof Element
				? range.startContainer
				: range.startContainer.parentElement;
		const blockId = element?.closest('[data-block="feedback"]')?.id;
		if (!blockId) {
			closePopup();
			return;
		}

		refs.setReference({
			getBoundingClientRect() {
				return range.getBoundingClientRect();
			},
			contextElement: container,
		});

		_setPopup({ mode: "tooltip", range, selection: selectionText, blockId });
	});

	const closeOnEscape = useEffectEvent((event: KeyboardEvent) => {
		if (popup === null) {
			return;
		}
		if (event.key === "Escape") {
			closePopup();
		}
	});

	const closeOnPointerDown = useEffectEvent((event: PointerEvent) => {
		const { target } = event;
		if (popup === null || !(target instanceof Node)) {
			return;
		}

		if (
			refs.floating.current?.contains(target) ||
			(popup.mode === "tooltip" && containerRef.current?.contains(target))
		) {
			return;
		}

		closePopup();
	});

	useEffect(() => {
		let frame: number | null = null;

		function scheduleSelectionPopover() {
			if (frame !== null) {
				window.cancelAnimationFrame(frame);
			}

			frame = window.requestAnimationFrame(() => {
				frame = null;
				updateSelectionPopover();
			});
		}

		document.addEventListener("selectionchange", scheduleSelectionPopover);
		document.addEventListener("keydown", closeOnEscape);
		document.addEventListener("pointerdown", closeOnPointerDown);

		return () => {
			document.removeEventListener("keydown", closeOnEscape);
			document.removeEventListener("pointerdown", closeOnPointerDown);
			document.removeEventListener("selectionchange", scheduleSelectionPopover);
			if (frame !== null) {
				window.cancelAnimationFrame(frame);
			}
		};
	}, []);

	return (
		<>
			{/* Runtime sheet: Lightning CSS rejects ::highlight in PostCSS/Tailwind pipelines. */}
			<style>{`
        ::highlight(fd-feedback-text) {
          background-color: var(--color-fd-primary);
          color: var(--color-fd-primary-foreground);
        }
      `}</style>
			<div className="prose-no-margin" ref={containerRef}>
				{children}
			</div>

			{popup ? (
				<div
					className={cn(
						"not-prose z-40 box-content h-9.5 w-30 overflow-hidden rounded-xl border bg-fd-popover text-fd-popover-foreground text-sm shadow-lg transition-[width,height]",
						popup.mode === "expanded"
							? "h-32 w-[300px] max-w-[98vw]"
							: "select-none",
					)}
					ref={refs.setFloating}
					style={floatingStyles}
				>
					{popup.mode === "tooltip" ? (
						<div className="h-9.5 w-30 p-1">
							<button
								className={cn(
									buttonVariants({ variant: "ghost", size: "sm" }),
									"size-full gap-1.5",
								)}
								onClick={expandPopup}
								type="button"
							>
								<CornerDownRightIcon className="size-4 text-fd-muted-foreground" />
								Feedback
							</button>
						</div>
					) : (
						<FeedbackTextForm
							blockId={popup.blockId}
							container={{
								className: "p-2 w-[300px] h-32 max-w-[98vw] animate-fd-fade-in",
							}}
							onClose={closePopup}
							onSendAction={onSendAction}
							selection={popup.selection}
						/>
					)}
				</div>
			) : null}
		</>
	);
}

function FeedbackTextForm({
	blockId,
	selection,
	onSendAction,
	onClose,
	container,
}: {
	container: HTMLAttributes<HTMLElement>;
	blockId: string;
	selection: string;
	onSendAction: (feedback: BlockFeedback) => Promise<ActionResponse>;
	onClose: () => void;
}) {
	const pathname = usePathname();
	const { previous, setPrevious } = useSubmissionStorage(
		`${pathname}-${blockId}`,
		(v) => {
			const result = blockFeedbackResult.safeParse(v);
			if (result.success) {
				return result.data;
			}
			return null;
		},
	);
	const [message, setMessage] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function submit(e?: SyntheticEvent) {
		startTransition(async () => {
			const feedback: BlockFeedback = {
				blockId,
				blockBody: selection,
				url: location.href,
				message,
			};

			try {
				setError(null);
				const response = await onSendAction(feedback);
				setPrevious({
					response,
					...feedback,
				});
				setMessage("");
			} catch (actionError) {
				setError(feedbackActionErrorMessage(actionError));
			}
		});

		e?.preventDefault();
	}

	if (previous) {
		return (
			<div
				{...container}
				className={cn(
					"flex flex-col items-center justify-center gap-2 text-center text-fd-muted-foreground",
					container.className,
				)}
			>
				<p>Thank you for your feedback!</p>
				<FeedbackThanksActions
					{...(previous.response?.githubUrl === undefined
						? {}
						: { githubUrl: previous.response.githubUrl })}
					onSubmitAgain={() => {
						setPrevious(null);
					}}
				/>
			</div>
		);
	}

	return (
		<form
			{...container}
			className={cn("flex flex-col gap-2", container.className)}
			onSubmit={submit}
		>
			<textarea
				autoFocus
				className="resize-none rounded-lg border bg-fd-secondary p-3 text-fd-secondary-foreground placeholder:text-fd-muted-foreground focus-visible:outline-none"
				onChange={(e) => setMessage(e.target.value)}
				onKeyDown={(e) => {
					if (!e.shiftKey && e.key === "Enter") {
						submit(e);
					}
				}}
				placeholder="Leave your feedback..."
				required
				value={message}
			/>
			{error ? (
				<p className="text-red-600 text-sm dark:text-red-400" role="alert">
					{error}
				</p>
			) : null}
			<div className="mt-auto grid grid-cols-2 gap-2">
				<button
					className={cn(
						buttonVariants({ variant: "primary", size: "sm" }),
						"gap-1.5",
					)}
					disabled={isPending}
					type="submit"
				>
					<CornerDownRightIcon className="size-4" />
					Submit
				</button>
				<button
					className={cn(
						buttonVariants({ variant: "secondary", size: "sm" }),
						"gap-1.5",
					)}
					disabled={isPending}
					onClick={onClose}
					type="button"
				>
					Close
				</button>
			</div>
		</form>
	);
}

function useSubmissionStorage<Result>(
	key: string,
	validate: (v: unknown) => Result | null,
) {
	const storageKey = `docs-feedback-${key}`;
	const [value, setValue] = useState<Result | null>(null);
	const validateCallback = useEffectEvent(validate);

	useEffect(() => {
		const item = localStorage.getItem(storageKey);
		if (item === null) {
			return;
		}
		const validated = validateCallback(JSON.parse(item));

		if (validated !== null) {
			setValue(validated);
		}
	}, [storageKey]);

	return {
		previous: value,
		setPrevious(result: Result | null) {
			if (result) {
				localStorage.setItem(storageKey, JSON.stringify(result));
			} else {
				localStorage.removeItem(storageKey);
			}

			setValue(result);
		},
	};
}
