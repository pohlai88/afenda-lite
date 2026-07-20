/**
 * Deduplicates concurrent identical requests — one in-flight factory per key.
 */
export class RequestDeduplicator {
	private readonly pending = new Map<string, Promise<unknown>>();

	async dedupe<T>(key: string, factory: () => Promise<T>): Promise<T> {
		const existing = this.pending.get(key);
		if (existing) {
			return existing as Promise<T>;
		}

		const promise = factory().finally(() => {
			this.pending.delete(key);
		});

		this.pending.set(key, promise);
		return promise;
	}
}
