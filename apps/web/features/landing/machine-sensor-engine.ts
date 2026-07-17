/**
 * Pure sensor math for The Machine landing (lab twin: public/lynx/lynx-the-machine.html).
 */

export const MACHINE_ART_SOURCE = "/lynx/lynx-landing-standard.png";

/** Cover-fit hotspot on the art (keyhole aperture under the chin). */
export const SENSOR_POINT = { x: 0.5, y: 0.742 } as const;

export const DETECT_ENTER = 0.74;
export const DETECT_EXIT = 0.46;
export const ARM_ENTER = 0.12;

export function clamp(value: number, min = 0, max = 1): number {
	return Math.min(max, Math.max(min, value));
}

export function coverPoint(
	nx: number,
	ny: number,
	viewportWidth: number,
	viewportHeight: number,
	imageWidth: number,
	imageHeight: number,
): { x: number; y: number } {
	const scale = Math.max(
		viewportWidth / imageWidth,
		viewportHeight / imageHeight,
	);
	const renderedWidth = imageWidth * scale;
	const renderedHeight = imageHeight * scale;

	return {
		x: (viewportWidth - renderedWidth) / 2 + nx * renderedWidth,
		y: (viewportHeight - renderedHeight) / 2 + ny * renderedHeight,
	};
}

export function resolveSensorPosition(input: {
	viewportWidth: number;
	viewportHeight: number;
	naturalWidth: number;
	naturalHeight: number;
}): { x: number; y: number } {
	const { viewportWidth, viewportHeight, naturalWidth, naturalHeight } = input;
	if (naturalWidth > 0 && naturalHeight > 0) {
		return coverPoint(
			SENSOR_POINT.x,
			SENSOR_POINT.y,
			viewportWidth,
			viewportHeight,
			naturalWidth,
			naturalHeight,
		);
	}
	return {
		x: viewportWidth * SENSOR_POINT.x,
		y: viewportHeight * SENSOR_POINT.y,
	};
}

export function proximityCharge(input: {
	clientX: number;
	clientY: number;
	sensorX: number;
	sensorY: number;
	viewportWidth: number;
}): number {
	const radius = clamp(input.viewportWidth * 0.18, 190, 300);
	const distance = Math.hypot(
		input.clientX - input.sensorX,
		input.clientY - input.sensorY,
	);
	return clamp(1 - distance / radius);
}

export function lerpCharge(
	current: number,
	target: number,
	reducedMotion: boolean,
	factor = 0.14,
): number {
	if (reducedMotion) {
		return target;
	}
	const next = current + (target - current) * factor;
	if (Math.abs(target - next) < 0.001) {
		return target;
	}
	return next;
}

export type SensorPhase = "observe" | "detecting" | "reacting";

export function sensorLabel(phase: SensorPhase): string {
	switch (phase) {
		case "reacting":
			return "Response active";
		case "detecting":
			return "Signal detected";
		case "observe":
			return "Observe";
		default: {
			const _exhaustive: never = phase;
			return _exhaustive;
		}
	}
}

export function sensorAriaLabel(reacting: boolean): string {
	return reacting ? "Reset the Machine" : "Activate the Machine";
}

export function nextDetectingState(
	currentDetecting: boolean,
	charge: number,
): boolean {
	if (!currentDetecting && charge >= DETECT_ENTER) {
		return true;
	}
	if (currentDetecting && charge <= DETECT_EXIT) {
		return false;
	}
	return currentDetecting;
}
