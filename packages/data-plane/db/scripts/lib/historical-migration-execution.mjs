/**
 * Historical reconciliation migrations that repaired databases whose ledger
 * was previously out of order. Under the identity-aware migrator, their source
 * migrations are applied directly first, so replaying the repair SQL would be
 * both redundant and unsafe. The exact repair identity is recorded as
 * satisfied without executing its SQL only after every named source identity
 * is proven applied in the same governed history.
 */
export const HISTORICAL_RECONCILIATION_MIGRATIONS = Object.freeze({
	"0033_schema_reconciliation": Object.freeze({
		hash: "4bb8065d004b267c30bca010c8042c9815a2213cd8a0638d861b018bebab2dbf",
		status: "historical-reconciliation-satisfied",
		reason:
			"Out-of-order ledger repair is non-applicable after its source migrations are applied directly.",
		satisfiedBy: Object.freeze([
			"0005_uneven_rage",
			"0006_cynical_roxanne_simpson",
			"0007_rich_proudstar",
			"0008_cloudy_strong_guy",
			"0009_lively_paibok",
			"0010_party_address_structured",
			"0011_party_contact_structured",
			"0012_party_external_id_structured",
			"0013_party_relationship_governed",
			"0014_item_uom_governed",
			"0015_item_barcode_governed",
			"0016_item_external_id_governed",
			"0017_item_alias_governed",
			"0018_warehouse_external_id_governed",
			"0019_template_attribute_governed",
			"0020_variant_attribute_value_typed",
			"0021_primary_record_scope",
			"0022_extension_database_constraints",
			"0024_item_core_operational_profile",
			"0025_warehouse_payment_tax_masters",
			"0027_master_data_database_constraints",
			"0028_ca_company_status_lifecycle",
			"0029_master_data_import_recovery",
		]),
	}),
});

/**
 * @param {{ tag: string, hash: string }} migration
 * @param {Set<string>} appliedTags
 */
export function getHistoricalReconciliationDisposition(migration, appliedTags) {
	const policy = HISTORICAL_RECONCILIATION_MIGRATIONS[migration.tag];
	if (!policy) {
		return null;
	}
	if (migration.hash !== policy.hash) {
		throw new Error(
			`Historical reconciliation bytes changed for ${migration.tag}`,
		);
	}
	const missingSources = policy.satisfiedBy.filter(
		(tag) => !appliedTags.has(tag),
	);
	if (missingSources.length > 0) {
		throw new Error(
			`Historical reconciliation ${migration.tag} is not satisfied; missing source identities: ${missingSources.join(", ")}`,
		);
	}
	return policy;
}
