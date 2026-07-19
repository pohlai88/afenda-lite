type QueueItem<K, V> = {
	key: K;
	resolve: (value: V | null) => void;
	reject: (error: Error) => void;
};

/**
 * Batches and deduplicates individual loads into one batchFn call (N+1 guard).
 */
export class BatchLoader<K, V> {
	private queue: Array<QueueItem<K, V>> = [];
	private scheduled = false;
	private readonly maxBatchSize: number;
	private readonly batchDelayMs: number;

	constructor(
		private readonly batchFn: (keys: K[]) => Promise<Map<K, V>>,
		options: { maxBatchSize?: number; batchDelayMs?: number } = {},
	) {
		this.maxBatchSize = options.maxBatchSize ?? 100;
		this.batchDelayMs = options.batchDelayMs ?? 10;
	}

	load(key: K): Promise<V | null> {
		return new Promise((resolve, reject) => {
			this.queue.push({ key, resolve, reject });

			if (!this.scheduled) {
				this.scheduled = true;
				setTimeout(() => {
					void this.executeBatch();
				}, this.batchDelayMs);
			}

			if (this.queue.length >= this.maxBatchSize) {
				void this.executeBatch();
			}
		});
	}

	private async executeBatch(): Promise<void> {
		this.scheduled = false;
		const batch = this.queue.splice(0);
		if (batch.length === 0) {
			return;
		}

		const uniqueKeys = [...new Set(batch.map((item) => item.key))];

		try {
			const results = await this.batchFn(uniqueKeys);
			for (const item of batch) {
				item.resolve(results.get(item.key) ?? null);
			}
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			for (const item of batch) {
				item.reject(err);
			}
		}
	}
}
