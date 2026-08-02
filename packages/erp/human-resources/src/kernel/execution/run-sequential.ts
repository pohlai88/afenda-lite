export interface SequentialBreak {
	kind: "break";
}

export interface SequentialContinue {
	kind: "continue";
}

export interface SequentialReturn<Value> {
	kind: "return";
	value: Value;
}

export type SequentialControl<Value> =
	| SequentialBreak
	| SequentialContinue
	| SequentialReturn<Value>;

const BREAK: SequentialBreak = { kind: "break" };
const CONTINUE: SequentialContinue = { kind: "continue" };

export function sequentialBreak(): SequentialBreak {
	return BREAK;
}

export function sequentialContinue(): SequentialContinue {
	return CONTINUE;
}

export function sequentialReturn<Value>(value: Value): SequentialReturn<Value> {
	return { kind: "return", value };
}

function isSequentialControl(
	value: unknown,
): value is SequentialControl<unknown> {
	if (typeof value !== "object" || value === null || !("kind" in value)) {
		return false;
	}
	return (
		value.kind === "break" ||
		value.kind === "continue" ||
		value.kind === "return"
	);
}

async function visitNextSequentially<Item>(
	iterator: Iterator<Item>,
	visit: (item: Item) => unknown,
): Promise<SequentialBreak | SequentialReturn<unknown>> {
	const next = iterator.next();
	if (next.done) {
		return BREAK;
	}
	const control = await visit(next.value);
	if (!isSequentialControl(control)) {
		return visitNextSequentially(iterator, visit);
	}
	if (control.kind === "return") {
		return control;
	}
	if (control.kind === "break") {
		return BREAK;
	}
	return visitNextSequentially(iterator, visit);
}

/** Runs promise-producing work serially while preserving loop control semantics. */
export function runSequential<Item, Value>(
	items: Iterable<Item>,
	visit: (
		item: Item,
	) =>
		| Promise<SequentialControl<Value> | undefined>
		| SequentialControl<Value>
		| undefined,
): Promise<SequentialBreak | SequentialReturn<Value>>;
export function runSequential<Item>(
	items: Iterable<Item>,
	visit: (item: Item) => Promise<void> | void,
): Promise<SequentialBreak>;
export function runSequential<Item>(
	items: Iterable<Item>,
	visit: (item: Item) => unknown,
): Promise<SequentialBreak | SequentialReturn<unknown>> {
	return visitNextSequentially(items[Symbol.iterator](), visit);
}
