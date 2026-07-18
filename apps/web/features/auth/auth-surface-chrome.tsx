import Image from "next/image";
import type { ReactNode } from "react";

import { AuthSurfaceRoot } from "@/features/auth/auth-surface-root";

/** Full-bleed ice plate — served from `apps/web/public/lynx/`. */
export const AUTH_ISLAND_BRAND_ART_ICE = "/lynx/lynx-icy3-wide.png";

/** Full-bleed fire plate — morphs in after panel thaw + ignition. */
export const AUTH_ISLAND_BRAND_ART_FIRE = "/lynx/lynx-fire-wide.png";

type AuthSurfaceChromeProps = {
	children: ReactNode;
};

/**
 * Neon Auth island chrome — cinematic ice↔fire lynx + glass credential column.
 * Owned by AuthIslandLayout so `/auth/*` path swaps only replace panel body.
 * Outer element is a div — AuthIslandLayout owns the sole `#main-content` landmark.
 * Strip: Studio credential forms, OAuth buttons, social-proof avatars.
 */
export function AuthSurfaceChrome({ children }: AuthSurfaceChromeProps) {
	return (
		<AuthSurfaceRoot>
			<div
				className="auth-surface__backdrop absolute inset-0"
				aria-hidden="true"
			>
				<div className="auth-surface__art-plane absolute inset-0">
					<Image
						src={AUTH_ISLAND_BRAND_ART_ICE}
						alt=""
						fill
						priority
						sizes="100vw"
						className="auth-surface__brand-art auth-surface__brand-art--ice object-cover object-center"
					/>
					<Image
						src={AUTH_ISLAND_BRAND_ART_FIRE}
						alt=""
						fill
						priority
						sizes="100vw"
						className="auth-surface__brand-art auth-surface__brand-art--fire object-cover object-center"
					/>
				</div>
				<div className="auth-surface__radiant auth-surface__radiant--ice pointer-events-none absolute inset-0" />
				<div className="auth-surface__radiant auth-surface__radiant--fire pointer-events-none absolute inset-0" />
				<div className="auth-surface__atmosphere pointer-events-none absolute inset-0" />
				<div className="auth-surface__steam pointer-events-none absolute inset-0" />
				<div className="auth-surface__embers pointer-events-none absolute inset-0">
					<div className="auth-surface__ember-field auth-surface__ember-field--a" />
					<div className="auth-surface__ember-field auth-surface__ember-field--b" />
				</div>
				<div className="auth-surface__weather pointer-events-none absolute inset-0">
					<div className="auth-surface__snow auth-surface__snow--a" />
					<div className="auth-surface__snow auth-surface__snow--b" />
				</div>
				<div className="auth-surface__veil pointer-events-none absolute inset-0" />
			</div>

			{/* Layout spacer — art is full-bleed behind the grid. */}
			<div
				className="auth-surface__stage relative min-h-[40vh] lg:min-h-dvh"
				aria-hidden="true"
			/>

			<div className="auth-surface__column relative z-10 flex min-h-0 flex-col justify-center p-6 lg:p-(--section-gap)">
				<div className="auth-surface__panel flex w-full flex-col gap-6">
					<div
						className="auth-surface__panel-frost pointer-events-none"
						aria-hidden="true"
					/>
					<div
						className="auth-surface__panel-ember pointer-events-none"
						aria-hidden="true"
					/>
					<div
						className="auth-surface__panel-heat pointer-events-none"
						aria-hidden="true"
					/>
					<p className="auth-surface__brand relative z-[1] text-center text-sm font-semibold tracking-[0.2em] uppercase">
						Afenda-Lite
					</p>
					<div className="auth-surface__panel-body relative z-[1] flex flex-col gap-6">
						{children}
					</div>
				</div>
			</div>
		</AuthSurfaceRoot>
	);
}
