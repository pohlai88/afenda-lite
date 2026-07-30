interface QueueItem<K, V> {
	key: K;
	reject: (error: Error) => void;
	resolve: (value: V | null) => void;
}

const BATCH_LOAD_FAILED_MESSAGE = "Batch load failed";

function normalizeBatchLoadError(error: unknown): Error {
	return error instanceof Error
		? error
		: new Error(BATCH_LOAD_FAILED_MESSAGE, { cause: error });
}

/**
 * Batches and deduplicates individual loads into one batchFn call (N+1 guard).
 */
export class BatchLoader<K, V> {
	private readonly queue: QueueItem<K, V>[] = [];
	private scheduledBatch: ReturnType<typeof setTimeout> | undefined;
	private readonly maxBatchSize: number;
	private readonly batchDelayMs: number;
	private readonly batchFn: (keys: K[]) => Promise<Map<K, V>>;

	constructor(
		batchFn: (keys: K[]) => Promise<Map<K, V>>,
		options: { maxBatchSize?: number; batchDelayMs?: number } = {},
	) {
		this.batchFn = batchFn;
		this.maxBatchSize = options.maxBatchSize ?? 100;
		this.batchDelayMs = options.batchDelayMs ?? 10;
	}

	load(key: K): Promise<V | null> {
		return new Promise((resolve, reject) => {
			this.queue.push({ key, resolve, reject });
			this.scheduleBatch();

			if (this.queue.length >= this.maxBatchSize) {
				this.executeBatch().catch(() => undefined);
			}
		});
	}

	private scheduleBatch(): void {
		if (this.scheduledBatch !== undefined) {
			return;
		}
		this.scheduledBatch = setTimeout(() => {
			this.executeBatch().catch(() => undefined);
		}, this.batchDelayMs);
	}

	private async executeBatch(): Promise<void> {
		this.scheduledBatch = undefined;
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
			const err = normalizeBatchLoadError(error);
			for (const item of batch) {
				item.reject(err);
			}
		}
	}
}
