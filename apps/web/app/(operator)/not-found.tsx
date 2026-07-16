import { Button } from "@afenda/ui-system";
import Link from "next/link";

import { OPERATOR_ADMIN_PATH } from "@/features/auth/operator-paths";

export default function OperatorNotFound() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-4 text-center">
			<h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
			<p className="max-w-sm text-sm text-foreground-secondary">
				That operator page does not exist.
			</p>
			<Button asChild variant="outline">
				<Link href={OPERATOR_ADMIN_PATH}>Back to admin</Link>
			</Button>
		</main>
	);
}
