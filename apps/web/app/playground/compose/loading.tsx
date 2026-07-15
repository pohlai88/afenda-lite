export default function ComposeLoading() {
	return (
		<div
			className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground"
			role="status"
			aria-live="polite"
		>
			Loading compose board…
		</div>
	);
}
