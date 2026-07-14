import Link from "next/link";

import { OPERATOR_ADMIN_PATH } from "@/features/auth/operator-paths";

export default function OperatorNotFound() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
			<h1 className="text-xl font-semibold tracking-tight">Not found</h1>
			<p className="max-w-sm text-sm text-muted-foreground">
				That operator page does not exist.
			</p>
			<Link
				href={OPERATOR_ADMIN_PATH}
				className="rounded-md border border-border bg-background px-4 py-2 text-sm"
			>
				Back to admin
			</Link>
		</main>
	);
}
