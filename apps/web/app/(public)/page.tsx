import { AUTH_LOGIN_PATH } from "@afenda/auth";
import { Button } from "@afenda/ui-system";
import Link from "next/link";

export default function HomePage() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-4">
			<h1 className="text-2xl font-semibold tracking-tight">Afenda-Lite</h1>
			<p className="max-w-md text-center text-sm text-foreground-secondary">
				Public shell. Operator and client surfaces are role-gated after sign-in.
			</p>
			<Button asChild>
				<Link href={AUTH_LOGIN_PATH}>Sign in</Link>
			</Button>
		</main>
	);
}
