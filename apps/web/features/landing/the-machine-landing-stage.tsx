"use client";

import {
	useCallback,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";

import { MAIN_CONTENT_ID } from "@/features/auth/main-content";
import { SignInButton } from "@/features/auth/sign-in-button";

import {
	ARM_ENTER,
	clamp,
	lerpCharge,
	MACHINE_ART_SOURCE,
	nextDetectingState,
	proximityCharge,
	resolveSensorPosition,
	type SensorPhase,
	sensorAriaLabel,
	sensorLabel,
} from "./machine-sensor-engine";

import "./the-machine-landing.css";

type SensorUiState = {
	armed: boolean;
	detecting: boolean;
	reacting: boolean;
};

type TheMachineLandingStageProps = {
	fontClassName?: string;
};

function phaseFromState(state: SensorUiState): SensorPhase {
	if (state.reacting) {
		return "reacting";
	}
	if (state.detecting) {
		return "detecting";
	}
	return "observe";
}

/**
 * Client stage for The Machine — sensor proximity + reaction (fonts from server parent).
 */
export function TheMachineLandingStage({
	fontClassName = "",
}: TheMachineLandingStageProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const sensorRef = useRef<HTMLButtonElement>(null);
	const chargeRef = useRef(0);
	const targetChargeRef = useRef(0);
	const chargeFrameRef = useRef(0);
	const sensorPosRef = useRef({ x: 0, y: 0 });
	const pointerRef = useRef<{ x: number; y: number } | null>(null);
	const naturalSizeRef = useRef({ width: 0, height: 0 });
	const reactingRef = useRef(false);
	const detectingRef = useRef(false);

	const [ui, setUi] = useState<SensorUiState>({
		armed: false,
		detecting: false,
		reacting: false,
	});

	const syncCssVars = useCallback(
		(charge: number, sensorX: number, sensorY: number) => {
			const root = rootRef.current;
			if (!root) {
				return;
			}
			root.style.setProperty("--charge", charge.toFixed(3));
			root.style.setProperty("--signal-x", `${sensorX.toFixed(2)}px`);
			root.style.setProperty("--signal-y", `${sensorY.toFixed(2)}px`);
		},
		[],
	);

	const updateSensorPosition = useCallback(() => {
		const width = window.innerWidth;
		const height = window.innerHeight;
		const point = resolveSensorPosition({
			viewportWidth: width,
			viewportHeight: height,
			naturalWidth: naturalSizeRef.current.width,
			naturalHeight: naturalSizeRef.current.height,
		});
		sensorPosRef.current = point;
		syncCssVars(chargeRef.current, point.x, point.y);
	}, [syncCssVars]);

	const renderCharge = useEffectEvent(() => {
		chargeFrameRef.current = 0;
		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		chargeRef.current = lerpCharge(
			chargeRef.current,
			targetChargeRef.current,
			reducedMotion,
		);
		syncCssVars(
			chargeRef.current,
			sensorPosRef.current.x,
			sensorPosRef.current.y,
		);
		if (chargeRef.current !== targetChargeRef.current) {
			chargeFrameRef.current = requestAnimationFrame(() => renderCharge());
		}
	});

	const setCharge = useEffectEvent((value: number) => {
		targetChargeRef.current = clamp(value);
		if (!chargeFrameRef.current) {
			chargeFrameRef.current = requestAnimationFrame(() => renderCharge());
		}
	});

	const applyPointerPosition = useEffectEvent(
		(clientX: number, clientY: number) => {
			pointerRef.current = { x: clientX, y: clientY };
			const finePointer = window.matchMedia(
				"(hover: hover) and (pointer: fine)",
			).matches;
			if (reactingRef.current || !finePointer) {
				return;
			}
			/* Visual center — sensor lives inside cinematicZoom art-plane */
			const sensorRect = sensorRef.current?.getBoundingClientRect();
			const sensorX = sensorRect
				? sensorRect.left + sensorRect.width / 2
				: sensorPosRef.current.x;
			const sensorY = sensorRect
				? sensorRect.top + sensorRect.height / 2
				: sensorPosRef.current.y;
			const charge = proximityCharge({
				clientX,
				clientY,
				sensorX,
				sensorY,
				viewportWidth: window.innerWidth,
			});
			setCharge(charge);
			const detecting = nextDetectingState(detectingRef.current, charge);
			detectingRef.current = detecting;
			setUi({
				armed: charge >= ARM_ENTER,
				detecting,
				reacting: false,
			});
		},
	);

	const resetProximity = useEffectEvent(() => {
		if (reactingRef.current) {
			return;
		}
		pointerRef.current = null;
		detectingRef.current = false;
		setCharge(0);
		setUi({ armed: false, detecting: false, reacting: false });
	});

	const toggleReaction = useEffectEvent(() => {
		const next = !reactingRef.current;
		reactingRef.current = next;
		if (next) {
			detectingRef.current = false;
			setCharge(1);
			setUi({ armed: true, detecting: false, reacting: true });
			return;
		}
		detectingRef.current = false;
		setCharge(0);
		setUi({ armed: false, detecting: false, reacting: false });
	});

	useEffect(() => {
		updateSensorPosition();

		const image = new Image();
		image.onload = () => {
			naturalSizeRef.current = {
				width: image.naturalWidth,
				height: image.naturalHeight,
			};
			updateSensorPosition();
		};
		image.onerror = () => {
			updateSensorPosition();
		};
		image.src = MACHINE_ART_SOURCE;

		const onResize = () => {
			updateSensorPosition();
			const pointer = pointerRef.current;
			if (pointer) {
				applyPointerPosition(pointer.x, pointer.y);
			}
		};
		const onPointerMove = (event: PointerEvent) => {
			applyPointerPosition(event.clientX, event.clientY);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && reactingRef.current) {
				toggleReaction();
				document.getElementById("lynx-sensor")?.focus({ preventScroll: true });
			}
		};

		const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

		window.addEventListener("resize", onResize);
		window.addEventListener("pointermove", onPointerMove, { passive: true });
		window.addEventListener("pointerleave", resetProximity);
		window.addEventListener("blur", resetProximity);
		window.addEventListener("keydown", onKeyDown);
		finePointer.addEventListener("change", resetProximity);
		reducedMotion.addEventListener("change", () => {
			setCharge(targetChargeRef.current);
		});

		return () => {
			window.removeEventListener("resize", onResize);
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerleave", resetProximity);
			window.removeEventListener("blur", resetProximity);
			window.removeEventListener("keydown", onKeyDown);
			finePointer.removeEventListener("change", resetProximity);
			if (chargeFrameRef.current) {
				cancelAnimationFrame(chargeFrameRef.current);
			}
		};
	}, [updateSensorPosition]);

	const phase = phaseFromState(ui);
	const rootClass = [
		"the-machine",
		fontClassName,
		ui.armed || ui.detecting || ui.reacting ? "is-armed" : "",
		ui.detecting && !ui.reacting ? "is-detecting" : "",
		ui.reacting ? "is-reacting" : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div ref={rootRef} className={rootClass}>
			<main className="stage" id={MAIN_CONTENT_ID} tabIndex={-1}>
				<div aria-hidden="true" className="art-plane art-zoom">
					<div className="hero-base" />
					<div className="hero-bloom" />
					<div className="hero-reveal" />
				</div>

				<div aria-hidden="true" className="ambient" />
				<div aria-hidden="true" className="vignette" />
				<div aria-hidden="true" className="grain" />

				{/* Same .art-zoom as art-plane — keeps blink locked to keyhole above atmosphere */}
				<div className="sensor-plane art-zoom">
					<div aria-hidden="true" className="geometry" />
					<button
						aria-label={sensorAriaLabel(ui.reacting)}
						aria-pressed={ui.reacting}
						className="sensor"
						id="lynx-sensor"
						ref={sensorRef}
						type="button"
						onClick={() => toggleReaction()}
						onPointerEnter={() => {
							const finePointer = window.matchMedia(
								"(hover: hover) and (pointer: fine)",
							).matches;
							if (!reactingRef.current && finePointer) {
								detectingRef.current = true;
								setCharge(1);
								setUi({ armed: true, detecting: true, reacting: false });
							}
						}}
					>
						<span aria-live="polite" className="sensor__label">
							{sensorLabel(phase)}
						</span>
						<span className="visually-hidden">
							Approach the Lynx to detect a signal. Press to activate or reset
							the response.
						</span>
					</button>
				</div>

				<header className="brandbar">
					<div className="brand" translate="no">
						<span aria-hidden="true" className="brand__mark" />
						Afenda
					</div>
					<div className="brandbar__end">
						<div className="brandbar__descriptor">
							Purpose-bound enterprise intelligence
						</div>
						<SignInButton surface="machine" />
					</div>
				</header>

				<section aria-labelledby="hero-title" className="copy">
					<p className="kicker">Prevention, engineered.</p>

					<h1 className="title" id="hero-title">
						<span className="title__article">The</span>
						<span className="title__word">
							<span className="title__ink">Machine</span>
							<span aria-hidden="true" className="title__echo">
								Machine
							</span>
						</span>
					</h1>

					<ol aria-label="Protect. Detect. React." className="sequence">
						<li className="sequence__item" data-phase="protect">
							<span aria-hidden="true" className="sequence__index">
								01
							</span>
							<span className="sequence__verb">
								Protect<span className="sequence__period">.</span>
							</span>
						</li>
						<li className="sequence__item" data-phase="detect">
							<span aria-hidden="true" className="sequence__index">
								02
							</span>
							<span className="sequence__verb">
								Detect<span className="sequence__period">.</span>
							</span>
						</li>
						<li className="sequence__item" data-phase="react">
							<span aria-hidden="true" className="sequence__index">
								03
							</span>
							<span className="sequence__verb">
								React<span className="sequence__period">.</span>
							</span>
						</li>
					</ol>

					<p className="support">
						<span>
							The Machine turns live business signals into early warning—so you
							can <strong>contain risk before it becomes disruption.</strong>
						</span>
					</p>
				</section>

				<nav aria-label="Enterprise coverage" className="scope">
					<span>Finance</span>
					<span>Operations</span>
					<span>Controls</span>
					<span>Compliance</span>
				</nav>
			</main>
		</div>
	);
}
