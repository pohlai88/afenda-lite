import type { ManifestContractInput } from "../contracts/manifest.contract";

type ExpectFalse<TValue extends false> = TValue;

type ValidInput = {
	readonly id: "ui.type-test.contract";
	readonly component: "ui.type-test";
	readonly purpose: "Type fixture.";
	readonly ownership: {
		readonly componentOwns: readonly ["Primitive presentation."];
		readonly consumerOwns: readonly ["Feature policy."];
	};
	readonly semanticBoundaries: readonly [
		"Presentation does not decide policy.",
	];
	readonly rules: readonly ["Use intentionally."];
	readonly accessibility: readonly ["Preserve semantics."];
	readonly prohibitedUsage: readonly ["Do not infer authority."];
};

type MissingSemanticBoundary = Omit<ValidInput, "semanticBoundaries">;
type MissingOwnership = Omit<ValidInput, "ownership">;
type EmptyComponentOwnership = Omit<ValidInput, "ownership"> & {
	readonly ownership: {
		readonly componentOwns: readonly [];
		readonly consumerOwns: readonly ["Feature policy."];
	};
};
type EmptyRules = Omit<ValidInput, "rules"> & { readonly rules: readonly [] };

export type ManifestContractTypeChecks = readonly [
	ExpectFalse<
		MissingSemanticBoundary extends ManifestContractInput ? true : false
	>,
	ExpectFalse<MissingOwnership extends ManifestContractInput ? true : false>,
	ExpectFalse<
		EmptyComponentOwnership extends ManifestContractInput ? true : false
	>,
	ExpectFalse<EmptyRules extends ManifestContractInput ? true : false>,
];
