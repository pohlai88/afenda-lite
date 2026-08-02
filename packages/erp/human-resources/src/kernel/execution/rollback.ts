/** Execute registered in-memory rollback operations in declaration order. */
export function runRollbacks(rollbacks: readonly (() => void)[]): void {
	for (const rollback of rollbacks) {
		rollback();
	}
}
