// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import {
	Button,
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
	Spinner,
} from "@afenda/ui-system";
import { LogIn } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";

import {
	type DevLoginActionState,
	devLoginAction,
} from "@/app/actions/dev-login";
import type {
	LocalDevLoginAvailability,
	LocalDevLoginRole,
} from "@/lib/local-dev-login";

const initialState: DevLoginActionState = null;

interface DevLoginRoleOption {
	label: string;
	role: LocalDevLoginRole;
}

interface DevLoginFabProps {
	availability: LocalDevLoginAvailability;
}

function roleOptionsFromAvailability(
	availability: LocalDevLoginAvailability,
): DevLoginRoleOption[] {
	const roles: DevLoginRoleOption[] = [];
	if (availability.operator) {
		roles.push({ role: "operator", label: "Operator" });
	}
	if (availability.client) {
		roles.push({ role: "client", label: "Client" });
	}
	return roles;
}

/**
 * Floating local-dev login control — operator / client fixtures from .env.local.
 */
export function DevLoginFab({ availability }: DevLoginFabProps) {
	const [state, formAction, pending] = useActionState(
		devLoginAction,
		initialState,
	);
	const [isPending, startTransition] = useTransition();
	const [open, setOpen] = useState(false);
	const busy = pending || isPending;
	const roles = roleOptionsFromAvailability(availability);

	useEffect(() => {
		if (state?.ok === false) {
			setOpen(true);
		}
	}, [state]);

	if (roles.length === 0) {
		return null;
	}

	function submitRole(role: "operator" | "client") {
		const formData = new FormData();
		formData.set("role", role);
		startTransition(() => {
			formAction(formData);
		});
	}

	const onlyRole = roles.length === 1 ? roles[0] : undefined;
	if (onlyRole !== undefined) {
		return (
			<div className="fixed right-5 bottom-5 z-[100]">
				<Button
					aria-label={`Local dev login as ${onlyRole.label}`}
					className="size-14 rounded-full shadow-(--shadow-raised)"
					disabled={busy}
					onClick={() => submitRole(onlyRole.role)}
					size="icon-lg"
					type="button"
				>
					{busy ? (
						<Spinner className="text-primary-foreground" size="sm" />
					) : (
						<LogIn aria-hidden />
					)}
				</Button>
				{state?.ok === false ? (
					<p
						className="mt-2 max-w-48 rounded-md border border-border bg-popover px-2 py-1 text-destructive text-xs"
						role="alert"
					>
						{state.message}
					</p>
				) : null}
			</div>
		);
	}

	return (
		<div className="fixed right-5 bottom-5 z-[100]">
			<Popover onOpenChange={setOpen} open={open}>
				<PopoverTrigger asChild>
					<Button
						aria-label="Local dev login"
						className="size-14 rounded-full shadow-(--shadow-raised)"
						disabled={busy}
						size="icon-lg"
						type="button"
					>
						{busy ? (
							<Spinner className="text-primary-foreground" size="sm" />
						) : (
							<LogIn aria-hidden />
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-56" side="top">
					<PopoverHeader>
						<PopoverTitle>Local dev login</PopoverTitle>
						<PopoverDescription>
							Uses SHARED_ADMIN_* / PREVIEW_CLIENT_* from .env.local.
						</PopoverDescription>
					</PopoverHeader>
					<div className="flex flex-col gap-2 pt-2">
						{roles.map((entry) => (
							<Button
								disabled={busy}
								key={entry.role}
								onClick={() => submitRole(entry.role)}
								type="button"
								variant="secondary"
							>
								{entry.label}
							</Button>
						))}
						{state?.ok === false ? (
							<p className="text-destructive text-xs" role="alert">
								{state.message}
							</p>
						) : null}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
