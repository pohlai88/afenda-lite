import { revalidatePath } from "next/cache";

/** Shared path revalidation after Receiving mutations (admin + client consoles). */
export function revalidateReceivingPaths(): void {
	revalidatePath("/admin/receiving");
	revalidatePath("/client/receiving");
}
