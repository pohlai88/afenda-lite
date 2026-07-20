/** Decimal money helpers — string in/out to preserve precision. */

export function computeLineAmount(
	quantity: string,
	unitPrice: string,
	discountAmount: string,
): string {
	const qty = Number(quantity);
	const price = Number(unitPrice);
	const discount = Number(discountAmount);
	const amount = qty * price - discount;
	return String(Number.isFinite(amount) ? Math.max(0, amount) : 0);
}

export function sumLineAmounts(
	lines: ReadonlyArray<{ lineAmount: string; discountAmount: string }>,
): {
	subtotalAmount: string;
	discountTotal: string;
	documentTotal: string;
} {
	let subtotal = 0;
	let discounts = 0;
	for (const line of lines) {
		subtotal += Number(line.lineAmount);
		discounts += Number(line.discountAmount);
	}
	return {
		subtotalAmount: String(subtotal),
		discountTotal: String(discounts),
		documentTotal: String(subtotal),
	};
}
