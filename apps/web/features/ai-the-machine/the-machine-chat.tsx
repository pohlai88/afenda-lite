"use client";

import { Button, Textarea } from "@afenda/ui-system";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

const AI_CHAT_API = "/api/ai/chat" as const;

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
				<p className="text-sm font-medium tracking-wide text-muted-foreground">
					The Machine
				</p>
				<h2 className="text-lg font-semibold text-foreground">
					Ask about platform or identity
				</h2>
			</header>

			<ul className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-md border border-border/60 bg-background/80 p-3">
				{messages.length === 0 ? (
					<li className="text-sm text-muted-foreground">
						No messages yet. Ask about organizations, roles, or sessions.
					</li>
				) : (
					messages.map((message) => (
						<li key={message.id} className="text-sm">
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

			{error !== undefined ? (
				<p className="text-sm text-destructive" role="alert">
					{error.message}
				</p>
			) : null}

			<form
				className="flex flex-col gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					const text = input.trim();
					if (text.length === 0 || busy) {
						return;
					}
					void sendMessage({ text });
					setInput("");
				}}
			>
				<Textarea
					value={input}
					onChange={(event) => setInput(event.target.value)}
					placeholder="Ask The Machine…"
					rows={3}
					disabled={busy}
					aria-label="Message for The Machine"
				/>
				<Button type="submit" disabled={busy || input.trim().length === 0}>
					{busy ? "Thinking…" : "Send"}
				</Button>
			</form>
		</section>
	);
}
