import type { ReactNode } from "react";

type AuthSurfaceChromeProps = {
	children: ReactNode;
};

/**
 * Shared Neon Auth island chrome (login · join · accept) — one composition (DRY).
 */
export function AuthSurfaceChrome({ children }: AuthSurfaceChromeProps) {
	return (
		<main className="auth-surface flex min-h-dvh flex-col items-center justify-center p-6">
			<div className="auth-surface__panel w-full max-w-md">
				<p className="auth-surface__brand mb-6 text-center text-sm font-medium tracking-[0.18em] uppercase">
					Afenda-Lite
				</p>
				{children}
			</div>
		</main>
	);
}
