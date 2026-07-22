/**
 * Store barrel export parity (compile-time).
 *
 * Store contracts are type-only exports; runtime key parity is not meaningful.
 * This test asserts the root barrel and `src/store/index` expose the same
 * composed `HumanResourcesStore` contract.
 */
import { describe, expect, it } from "vitest";

import type {
	EmployeeCreateRecord as EmployeeCreateRecordFromBarrel,
	HumanResourcesStore as HumanResourcesStoreFromBarrel,
	LeaveRequestCreateRecord as LeaveRequestCreateRecordFromBarrel,
} from "../src/store";
import type {
	EmployeeCreateRecord as EmployeeCreateRecordFromIndex,
	HumanResourcesStore as HumanResourcesStoreFromIndex,
	LeaveRequestCreateRecord as LeaveRequestCreateRecordFromIndex,
} from "../src/store/index";

type AssertNever<T extends never> = T;
type AssertTrue<T extends true> = T;

type StoreParity =
	HumanResourcesStoreFromBarrel extends HumanResourcesStoreFromIndex
		? HumanResourcesStoreFromIndex extends HumanResourcesStoreFromBarrel
			? true
			: false
		: false;

type EmployeeRecordParity =
	EmployeeCreateRecordFromBarrel extends EmployeeCreateRecordFromIndex
		? EmployeeCreateRecordFromIndex extends EmployeeCreateRecordFromBarrel
			? true
			: false
		: false;

type LeaveRecordParity =
	LeaveRequestCreateRecordFromBarrel extends LeaveRequestCreateRecordFromIndex
		? LeaveRequestCreateRecordFromIndex extends LeaveRequestCreateRecordFromBarrel
			? true
			: false
		: false;

type _StoreBarrelParity = AssertTrue<StoreParity>;
type _EmployeeRecordParity = AssertTrue<EmployeeRecordParity>;
type _LeaveRecordParity = AssertTrue<LeaveRecordParity>;

type BarrelMethodKeys = keyof HumanResourcesStoreFromBarrel;
type IndexMethodKeys = keyof HumanResourcesStoreFromIndex;
type MissingFromBarrel = Exclude<IndexMethodKeys, BarrelMethodKeys>;
type MissingFromIndex = Exclude<BarrelMethodKeys, IndexMethodKeys>;
type _NoMissingBarrelMethods = AssertNever<MissingFromBarrel>;
type _NoMissingIndexMethods = AssertNever<MissingFromIndex>;

describe("store barrel export parity", () => {
	it("root barrel matches src/store/index contract", () => {
		const _store: _StoreBarrelParity = undefined as never;
		const _employee: _EmployeeRecordParity = undefined as never;
		const _leave: _LeaveRecordParity = undefined as never;
		const _barrelMethods: _NoMissingBarrelMethods = undefined as never;
		const _indexMethods: _NoMissingIndexMethods = undefined as never;

		expect(_store).toBeUndefined();
		expect(_employee).toBeUndefined();
		expect(_leave).toBeUndefined();
		expect(_barrelMethods).toBeUndefined();
		expect(_indexMethods).toBeUndefined();
	});
});
