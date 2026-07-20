import { revalidatePath } from "next/cache";

/** Shared path invalidation after payables mutations / shell-affecting reads. */
export function revalidatePayablesPaths(): void {
	revalidatePath("/admin/payables");
	revalidatePath("/client/payables");
}
