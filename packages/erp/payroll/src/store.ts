declare const payrollStoreBrand: unique symbol;

/** Persistence contract — methods added when command slices land. */
export type PayrollStore = {
	[payrollStoreBrand]?: never;
};
