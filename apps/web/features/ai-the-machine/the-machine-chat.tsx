// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import { Button, Textarea } from "@afenda/ui-system";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

const AI_CHAT_API = "/api/ai/chat" as const;
const AI_CHAT_ERROR_MESSAGE =
	"The assistant could not complete the request. Please try again.";

function messageText(
	parts: ReadonlyArray<{ type: string; text?: string }>,
): string {
	return parts
		.filter((part) => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text ?? "")
		.join("");
}

/**
 * Authenticated The Machine panel — AI SDK v6 transport to POST /api/ai/chat.
 */
export function TheMachineChat() {
	const [input, setInput] = useState("");
	const { messages, sendMessage, status, error } = useChat({
		transport: new DefaultChatTransport({ api: AI_CHAT_API }),
	});

	const busy = status === "submitted" || status === "streaming";

	return (
		<section
			aria-label="The Machine"
			className="mx-auto flex w-full max-w-lg flex-col gap-4 text-left"
		>
			<header className="space-y-1">
				<p className="font-medium text-muted-foreground text-sm tracking-wide">
					The Machine
				</p>
				<h2 className="font-semibold text-foreground text-lg">
					Ask about platform or identity
				</h2>
			</header>

			<ul className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-md border border-border bg-surface-sunken p-3">
				{messages.length === 0 ? (
					<li className="text-foreground-secondary text-sm">
						No messages yet. Ask about organizations, roles, or sessions.
					</li>
				) : (
					messages.map((message) => (
						<li className="text-sm" key={message.id}>
							<span className="font-medium text-foreground">
								{message.role === "user" ? "You" : "Machine"}
							</span>
							<p className="mt-1 whitespace-pre-wrap text-muted-foreground">
								{messageText(message.parts)}
							</p>
						</li>
					))
				)}
			</ul>

			{error === undefined ? null : (
				<p className="text-destructive text-sm" role="alert">
					{AI_CHAT_ERROR_MESSAGE}
				</p>
			)}

			<form
				className="flex flex-col gap-2"
				onSubmit={async (event) => {
					event.preventDefault();
					const text = input.trim();
					if (text.length === 0 || busy) {
						return;
					}
					await sendMessage({ text });
					setInput("");
				}}
			>
				<Textarea
					aria-label="Message for The Machine"
					disabled={busy}
					onChange={(event) => setInput(event.target.value)}
					placeholder="Ask The Machine…"
					rows={3}
					value={input}
				/>
				<Button disabled={busy || input.trim().length === 0} type="submit">
					{busy ? "Thinking…" : "Send"}
				</Button>
			</form>
		</section>
	);
}
