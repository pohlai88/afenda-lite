const DIRECTIVE_PATTERN = /^[a-z][a-z0-9-]*$/;
const UNSAFE_VALUE_PATTERN = /[;\r\n]/;

export interface CspDirectives {
	readonly [directive: string]: readonly string[];
}

function assertSafeToken(value: string, label: string): void {
	if (value.trim() === "" || UNSAFE_VALUE_PATTERN.test(value)) {
		throw new RangeError(`@afenda/security CSP ${label} is unsafe`);
	}
}

export function buildContentSecurityPolicy(directives: CspDirectives): string {
	const parts: string[] = [];
	for (const [directive, values] of Object.entries(directives)) {
		if (!DIRECTIVE_PATTERN.test(directive)) {
			throw new RangeError("@afenda/security CSP directive name is unsafe");
		}
		for (const value of values) {
			assertSafeToken(value, "value");
		}
		parts.push(
			values.length === 0 ? directive : `${directive} ${values.join(" ")}`,
		);
	}
	return parts.join("; ");
}
