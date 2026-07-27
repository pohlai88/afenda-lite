export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
	| JsonPrimitive
	| readonly JsonValue[]
	| Readonly<{ [key: string]: JsonValue }>;

export type JsonObject = Readonly<{
	[key: string]: JsonValue;
}>;

export type JsonValidationOptions = Readonly<{
	maxDepth?: number;
	maxArrayLength?: number;
	maxStringLength?: number;
}>;

export function assertJsonValue(
	value: unknown,
	path = "$",
	seen: WeakSet<object> = new WeakSet<object>(),
	options: JsonValidationOptions = {},
): asserts value is JsonValue {
	const maxDepth = options.maxDepth ?? 8;
	const maxArrayLength = options.maxArrayLength ?? 256;
	const maxStringLength = options.maxStringLength ?? 2048;

	assertJsonValueAtPath(value, {
		path,
		depth: 0,
		seen,
		maxDepth,
		maxArrayLength,
		maxStringLength,
	});
}

type JsonValidationContext = Readonly<{
	path: string;
	depth: number;
	seen: WeakSet<object>;
	maxDepth: number;
	maxArrayLength: number;
	maxStringLength: number;
}>;

function assertJsonValueAtPath(
	value: unknown,
	context: JsonValidationContext,
): asserts value is JsonValue {
	if (context.depth > context.maxDepth) {
		throw new Error(`${context.path} exceeds maximum JSON depth`);
	}
	if (value === null) {
		return;
	}
	switch (typeof value) {
		case "string":
			if (value.length > context.maxStringLength) {
				throw new Error(`${context.path} exceeds maximum JSON string length`);
			}
			return;
		case "boolean":
			return;
		case "number":
			if (!Number.isFinite(value)) {
				throw new Error(`${context.path} must contain only finite numbers`);
			}
			return;
		case "object":
			assertJsonObjectOrArray(value, context);
			return;
		default:
			throw new Error(`${context.path} is not JSON-compatible`);
	}
}

function assertJsonObjectOrArray(
	value: object,
	context: JsonValidationContext,
): void {
	if (context.seen.has(value)) {
		throw new Error(`${context.path} must not contain circular references`);
	}
	context.seen.add(value);

	if (Array.isArray(value)) {
		if (value.length > context.maxArrayLength) {
			throw new Error(`${context.path} exceeds maximum JSON array length`);
		}
		for (let index = 0; index < value.length; index += 1) {
			assertJsonValueAtPath(value[index], {
				...context,
				path: `${context.path}[${index}]`,
				depth: context.depth + 1,
			});
		}
		context.seen.delete(value);
		return;
	}

	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) {
		throw new Error(`${context.path} must be a plain JSON object`);
	}

	for (const [key, child] of Object.entries(value)) {
		if (key.trim().length === 0) {
			throw new Error(`${context.path} contains a blank object key`);
		}
		if (key !== key.trim()) {
			throw new Error(
				`${context.path} contains an object key with surrounding whitespace`,
			);
		}
		assertJsonValueAtPath(child, {
			...context,
			path: `${context.path}.${key}`,
			depth: context.depth + 1,
		});
	}

	context.seen.delete(value);
}
