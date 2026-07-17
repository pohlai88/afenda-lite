import { describe, expect, it } from "vitest";

import {
	ARM_ENTER,
	clamp,
	coverPoint,
	lerpCharge,
	nextDetectingState,
	proximityCharge,
	resolveSensorPosition,
	sensorAriaLabel,
	sensorLabel,
} from "@/features/landing/machine-sensor-engine";

describe("machine-sensor-engine", () => {
	it("clamps to [0, 1] by default", () => {
		expect(clamp(-1)).toBe(0);
		expect(clamp(0.5)).toBe(0.5);
		expect(clamp(2)).toBe(1);
	});

	it("maps normalized art points through object-fit: cover", () => {
		// 200×100 image into 100×100 viewport → scale 1, offset x -50
		const point = coverPoint(0.5, 0.5, 100, 100, 200, 100);
		expect(point.x).toBeCloseTo(50);
		expect(point.y).toBeCloseTo(50);
	});

	it("falls back to viewport fractions when image size unknown", () => {
		const point = resolveSensorPosition({
			viewportWidth: 1000,
			viewportHeight: 800,
			naturalWidth: 0,
			naturalHeight: 0,
		});
		expect(point.x).toBe(500);
		expect(point.y).toBeCloseTo(800 * 0.742);
	});

	it("computes proximity charge from sensor hotspot", () => {
		const atSensor = proximityCharge({
			clientX: 100,
			clientY: 100,
			sensorX: 100,
			sensorY: 100,
			viewportWidth: 1200,
		});
		expect(atSensor).toBe(1);

		const far = proximityCharge({
			clientX: 0,
			clientY: 0,
			sensorX: 1000,
			sensorY: 1000,
			viewportWidth: 1200,
		});
		expect(far).toBe(0);
	});

	it("lerps charge unless reduced motion", () => {
		expect(lerpCharge(0, 1, true)).toBe(1);
		expect(lerpCharge(0, 1, false)).toBeCloseTo(0.14);
		expect(lerpCharge(0.9995, 1, false)).toBe(1);
	});

	it("hysteresis for detecting enter/exit", () => {
		expect(nextDetectingState(false, ARM_ENTER)).toBe(false);
		expect(nextDetectingState(false, 0.74)).toBe(true);
		expect(nextDetectingState(true, 0.5)).toBe(true);
		expect(nextDetectingState(true, 0.46)).toBe(false);
	});

	it("exposes sensor copy for phases", () => {
		expect(sensorLabel("observe")).toBe("Observe");
		expect(sensorLabel("detecting")).toBe("Signal detected");
		expect(sensorLabel("reacting")).toBe("Response active");
		expect(sensorAriaLabel(false)).toBe("Activate the Machine");
		expect(sensorAriaLabel(true)).toBe("Reset the Machine");
	});
});
