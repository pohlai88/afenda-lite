import type { SalesOrder, SalesOrderListSort } from "../types";

export function compareSalesOrdersBySort(
	left: SalesOrder,
	right: SalesOrder,
	sort: SalesOrderListSort,
): number {
	switch (sort) {
		case "updatedAt:desc":
			return (
				right.updatedAt.getTime() - left.updatedAt.getTime() ||
				right.id.localeCompare(left.id)
			);
		case "updatedAt:asc":
			return (
				left.updatedAt.getTime() - right.updatedAt.getTime() ||
				left.id.localeCompare(right.id)
			);
		case "createdAt:desc":
			return (
				right.createdAt.getTime() - left.createdAt.getTime() ||
				right.id.localeCompare(left.id)
			);
		case "createdAt:asc":
			return (
				left.createdAt.getTime() - right.createdAt.getTime() ||
				left.id.localeCompare(right.id)
			);
		case "code:asc":
			return (
				left.normalizedCode.localeCompare(right.normalizedCode) ||
				left.id.localeCompare(right.id)
			);
		case "code:desc":
			return (
				right.normalizedCode.localeCompare(left.normalizedCode) ||
				right.id.localeCompare(left.id)
			);
		default: {
			const _exhaustive: never = sort;
			return _exhaustive;
		}
	}
}
