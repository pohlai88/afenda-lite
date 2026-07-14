import { AUTH_LOGIN_PATH } from "@afenda/auth";
import Link from "next/link";

export default function HomePage() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
			<h1 className="text-3xl font-semibold tracking-tight">Afenda-Lite</h1>
			<p className="max-w-md text-center text-muted-foreground">
				Public shell. Operator and client surfaces are role-gated after sign-in.
			</p>
			<Link
				href={AUTH_LOGIN_PATH}
				className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
			>
				Sign in
			</Link>
		</main>
	);
}
