import { Skeleton } from "@afenda/ui-system";

export function ManagerWorkspaceLoading() {
	return (
		<main
			className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6"
			aria-label="Loading manager workspace"
		>
			<div className="space-y-3">
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-full max-w-2xl" />
			</div>
			<Skeleton className="h-9 w-full max-w-3xl" />
			<Skeleton className="h-72 w-full" />
		</main>
	);
}
