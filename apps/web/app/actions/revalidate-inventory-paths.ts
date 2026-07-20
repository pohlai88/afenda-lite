import { revalidatePath } from "next/cache";

/** Dual-surface inventory console paths after stock mutations. */
export function revalidateInventoryPaths(): void {
	revalidatePath("/admin/inventory");
	revalidatePath("/client/inventory");
}
