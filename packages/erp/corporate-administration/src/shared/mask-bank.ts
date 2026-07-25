export function maskBankAccountIdentity(accountIdentity: string): string {
	const digits = accountIdentity.replace(/\D/g, "");
	if (digits.length === 0) {
		return "****";
	}
	const lastFour = digits.slice(-4);
	return `****${lastFour}`;
}

export function tokenizeBankAccountIdentity(accountIdentity: string): {
	accountIdentityToken: string;
	displayMaskedAccount: string;
} {
	const trimmed = accountIdentity.trim();
	return {
		accountIdentityToken: trimmed,
		displayMaskedAccount: maskBankAccountIdentity(trimmed),
	};
}
