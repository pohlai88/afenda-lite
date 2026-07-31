/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { HISTORICAL_ERROR_ALIASES } from "../contract/aliases";
import { ERROR_LIMITS } from "../contract/bounds";
import { getErrorDefinition, isCanonicalErrorCode } from "../contract/registry";
import { createPublicErrorData } from "../internal/public-error-data";
import type { CanonicalErrorCode, PublicErrorData } from "../public-types";
import { utf8ByteLength } from "../security/normalize";
import { FAILURE_WIRE_SCHEMA, type ParsedWireFailure } from "./types";

const INVALID_WIRE_VALUE = Symbol("invalid-wire-value");
const MAXIMUM_WIRE_ARRAY_ITEMS = ERROR_LIMITS.fieldInputMessagesPerField;
const MAXIMUM_WIRE_TOTAL_ARRAY_ITEMS =
	ERROR_LIMITS.fieldCount * ERROR_LIMITS.fieldMessagesPerField;

type InvalidWireValue = typeof INVALID_WIRE_VALUE;
type WireRecord = Readonly<Record<string, unknown>>;
interface SnapshotState {
	items: number;
	keys: number;
	rawBytes: number;
	readonly seen: WeakSet<object>;
}

function isWireRecord(value: unknown): value is WireRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function reserveRawTextBytes(value: string, state: SnapshotState): boolean {
	const remainingBytes = ERROR_LIMITS.wireBytes - state.rawBytes;
	if (value.length > remainingBytes) {
		return false;
	}
	const bytes = utf8ByteLength(value);
	if (bytes > remainingBytes) {
		return false;
	}
	state.rawBytes += bytes;
	return true;
}

function copyPrimitive(
	value: unknown,
	state: SnapshotState,
): unknown | InvalidWireValue {
	if (
		value === null ||
		typeof value === "boolean" ||
		(typeof value === "number" && Number.isFinite(value))
	) {
		return value;
	}
	if (typeof value !== "string" || !reserveRawTextBytes(value, state)) {
		return INVALID_WIRE_VALUE;
	}
	return value;
}

function ownDataDescriptor(
	value: object,
	key: PropertyKey,
): PropertyDescriptor | undefined {
	const descriptor = Object.getOwnPropertyDescriptor(value, key);
	return descriptor !== undefined &&
		"value" in descriptor &&
		descriptor.get === undefined &&
		descriptor.set === undefined
		? descriptor
		: undefined;
}

function copyArray(
	value: readonly unknown[],
	depth: number,
	state: SnapshotState,
): readonly unknown[] | InvalidWireValue {
	if (Object.getPrototypeOf(value) !== Array.prototype) {
		return INVALID_WIRE_VALUE;
	}
	const lengthDescriptor = ownDataDescriptor(value, "length");
	const length = lengthDescriptor?.value;
	if (
		typeof length !== "number" ||
		!Number.isSafeInteger(length) ||
		length < 0 ||
		length > MAXIMUM_WIRE_ARRAY_ITEMS
	) {
		return INVALID_WIRE_VALUE;
	}
	if (state.items + length > MAXIMUM_WIRE_TOTAL_ARRAY_ITEMS) {
		return INVALID_WIRE_VALUE;
	}
	state.items += length;
	const ownKeys = Reflect.ownKeys(value);
	if (
		ownKeys.length !== length + 1 ||
		!ownKeys.every(
			(key) =>
				typeof key === "string" &&
				(key === "length" ||
					(Number.isSafeInteger(Number(key)) &&
						String(Number(key)) === key &&
						Number(key) >= 0 &&
						Number(key) < length)),
		)
	) {
		return INVALID_WIRE_VALUE;
	}

	const output: unknown[] = [];
	for (let index = 0; index < length; index += 1) {
		const descriptor = ownDataDescriptor(value, String(index));
		if (descriptor === undefined || !descriptor.enumerable) {
			return INVALID_WIRE_VALUE;
		}
		const copied = copyWireValue(descriptor.value, depth + 1, state);
		if (copied === INVALID_WIRE_VALUE) {
			return INVALID_WIRE_VALUE;
		}
		output.push(copied);
	}
	return Object.freeze(output);
}

function copyRecord(
	value: WireRecord,
	depth: number,
	state: SnapshotState,
): WireRecord | InvalidWireValue {
	const ownKeys = Reflect.ownKeys(value);
	if (state.keys + ownKeys.length > ERROR_LIMITS.wireKeys) {
		return INVALID_WIRE_VALUE;
	}
	for (const key of ownKeys) {
		if (typeof key !== "string" || !reserveRawTextBytes(key, state)) {
			return INVALID_WIRE_VALUE;
		}
	}
	state.keys += ownKeys.length;
	const output: Record<string, unknown> = Object.create(null);
	for (const key of ownKeys) {
		if (typeof key !== "string") {
			return INVALID_WIRE_VALUE;
		}
		const descriptor = ownDataDescriptor(value, key);
		if (descriptor === undefined || !descriptor.enumerable) {
			return INVALID_WIRE_VALUE;
		}
		const copied = copyWireValue(descriptor.value, depth + 1, state);
		if (copied === INVALID_WIRE_VALUE) {
			return INVALID_WIRE_VALUE;
		}
		Object.defineProperty(output, key, {
			configurable: false,
			enumerable: true,
			value: copied,
			writable: false,
		});
	}
	return Object.freeze(output);
}

function copyWireValue(
	value: unknown,
	depth: number,
	state: SnapshotState,
): unknown | InvalidWireValue {
	if (typeof value !== "object" || value === null) {
		return copyPrimitive(value, state);
	}
	if (depth > ERROR_LIMITS.wireDepth || state.seen.has(value)) {
		return INVALID_WIRE_VALUE;
	}
	state.seen.add(value);
	try {
		if (Array.isArray(value)) {
			return copyArray(value, depth, state);
		}
		return isWireRecord(value)
			? copyRecord(value, depth, state)
			: INVALID_WIRE_VALUE;
	} finally {
		state.seen.delete(value);
	}
}

/** Copies hostile input into inert data while enforcing every frozen wire bound. */
export function boundedWireSnapshot(input: unknown): unknown | undefined {
	try {
		const copied = copyWireValue(input, 1, {
			items: 0,
			keys: 0,
			rawBytes: 0,
			seen: new WeakSet<object>(),
		});
		if (copied === INVALID_WIRE_VALUE) {
			return;
		}
		const serialized = JSON.stringify(copied);
		return typeof serialized === "string" &&
			utf8ByteLength(serialized) <= ERROR_LIMITS.wireBytes
			? copied
			: undefined;
	} catch {
		// Proxy traps and hostile reflection fail closed.
	}
}

function hasExactKeys(
	value: WireRecord,
	required: readonly string[],
	optional: readonly string[] = [],
): boolean {
	const keys = Object.keys(value);
	const allowed = new Set([...required, ...optional]);
	return (
		keys.length >= required.length &&
		keys.every((key) => allowed.has(key)) &&
		required.every((key) => Object.hasOwn(value, key))
	);
}

export function resolveAcceptedErrorCode(
	value: unknown,
): CanonicalErrorCode | undefined {
	if (isCanonicalErrorCode(value)) {
		return value;
	}
	if (typeof value !== "string") {
		return;
	}
	for (const [alias, canonicalCode] of Object.entries(
		HISTORICAL_ERROR_ALIASES,
	)) {
		if (alias === value && isCanonicalErrorCode(canonicalCode)) {
			return canonicalCode;
		}
	}
}

function hasExactPublicDetailKeys(
	code: CanonicalErrorCode,
	details: WireRecord,
): boolean {
	const allowedKeys = getErrorDefinition(code).details.publicKeys;
	const keys = Object.keys(details);
	return (
		keys.length > 0 &&
		keys.length <= allowedKeys.length &&
		keys.every((key) => allowedKeys.includes(key))
	);
}

export function canonicalizeWirePublicData(
	code: CanonicalErrorCode,
	message: string,
	details: unknown,
	strictDetails: boolean,
): PublicErrorData | undefined {
	const definition = getErrorDefinition(code);
	if (details !== undefined && !isWireRecord(details)) {
		return;
	}
	if (
		strictDetails &&
		details !== undefined &&
		!hasExactPublicDetailKeys(code, details)
	) {
		return;
	}
	const normalizedDetails = definition.details.normalize(details);
	if (
		strictDetails &&
		details !== undefined &&
		normalizedDetails === undefined
	) {
		return;
	}
	const input =
		normalizedDetails === undefined
			? Object.freeze({ publicMessage: message })
			: Object.freeze({ ...normalizedDetails, publicMessage: message });
	return createPublicErrorData(code, input);
}

export function parseCurrentFailureEnvelope(
	input: unknown,
): ParsedWireFailure | undefined {
	if (!(isWireRecord(input) && hasExactKeys(input, ["error", "schema"]))) {
		return;
	}
	if (input.schema !== FAILURE_WIRE_SCHEMA || !isWireRecord(input.error)) {
		return;
	}
	if (
		!hasExactKeys(input.error, ["code", "message", "messageKey"], ["details"])
	) {
		return;
	}
	const code = resolveAcceptedErrorCode(input.error.code);
	if (code === undefined || typeof input.error.message !== "string") {
		return;
	}
	const definition = getErrorDefinition(code);
	if (input.error.messageKey !== definition.public.messageKey) {
		return;
	}
	const publicData = canonicalizeWirePublicData(
		code,
		input.error.message,
		input.error.details,
		true,
	);
	return publicData === undefined
		? undefined
		: Object.freeze({ code, publicData });
}

export function parseResultFailure(
	input: unknown,
): ParsedWireFailure | undefined {
	if (!isWireRecord(input)) {
		return;
	}
	if (
		!hasExactKeys(
			input,
			["code", "message", "messageKey", "ok"],
			["details"],
		) ||
		input.ok !== false ||
		!isCanonicalErrorCode(input.code) ||
		typeof input.message !== "string"
	) {
		return;
	}
	const { code } = input;
	if (input.messageKey !== getErrorDefinition(code).public.messageKey) {
		return;
	}
	const publicData = canonicalizeWirePublicData(
		code,
		input.message,
		input.details,
		true,
	);
	return publicData === undefined
		? undefined
		: Object.freeze({ code, publicData });
}

export { isWireRecord };
