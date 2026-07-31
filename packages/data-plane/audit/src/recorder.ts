import type { Result } from "@afenda/errors";

import { createDrizzleAuditStore } from "./drizzle-store";
import { prepareAuditWrite } from "./prepare-write";
import type { AuditStore } from "./store";
import { observeAuditOperation } from "./telemetry";
import type { AuditEntry } from "./types";

export interface CreateAuditRecorderOptions {
	store?: AuditStore;
}

export interface AuditRecorder {
	record: (input: unknown) => Promise<Result<AuditEntry>>;
}

export function createAuditRecorder(
	options: CreateAuditRecorderOptions = {},
): AuditRecorder {
	const store = options.store ?? createDrizzleAuditStore();

	return {
		record(input: unknown): Promise<Result<AuditEntry>> {
			return observeAuditOperation("record", () => {
				const prepared = prepareAuditWrite(input);
				if (!prepared.ok) {
					return prepared;
				}
				return store.write(prepared.data);
			});
		},
	};
}
