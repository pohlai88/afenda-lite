import { defineManifestContract } from "./manifest.contract";

export const pageHeaderContract = defineManifestContract({
	id: "ui.page-header.contract",
	component: "ui.page-header",
	purpose:
		"Provides page, section, and record identity with scope-appropriate description, metadata, status, and actions.",
	ownership: {
		componentOwns: [
			"Scope-aware header composition, visual hierarchy, metadata placement, and action layout.",
		],
		consumerOwns: [
			"Document heading levels, page or entity identity, action authorization, status derivation, and domain metadata.",
		],
	},
	semanticBoundaries: [
		"Header prominence does not determine document heading level or page ownership.",
		"Action placement does not determine authorization or workflow priority.",
		"Displayed metadata or status does not establish authoritative domain state.",
	],
	rules: [
		"This contract governs PageHeader, SectionHeader, and EntityHeader as one header-composition family.",
		"Use PageHeader once for the primary identity of a page-level surface.",
		"Use PageHeaderHeading for the page's primary heading.",
		"Keep PageHeader actions limited to commands that apply to the current page scope or principal workflow.",
		"Use SectionHeader for major content sections and limit its actions to that section's content.",
		"Supply a semantic heading at the correct document level within SectionHeader because SectionHeader provides layout but does not create the heading.",
		"Use EntityHeader on record-detail surfaces where the record itself is the page subject.",
		"Use StatusBadge in EntityHeader only for authoritative lifecycle, approval, health, or operational state.",
		"Keep entity metadata concise, stable, and primarily read-only.",
		"Move filters, view controls, and dense operational commands into a dedicated toolbar or filter surface.",
	],
	accessibility: [
		"Use one primary h1 for the page-level surface.",
		"Use heading levels that preserve the document hierarchy rather than choosing levels for visual size.",
		"Expose the record's meaningful name or identifier as the primary heading on entity-detail surfaces.",
		"Descriptions must clarify page purpose, current scope, or record context when that information is not already apparent.",
		"Header actions must have clear accessible names and a predictable keyboard order.",
		"Entity metadata must remain understandable without relying on icons, placement, abbreviation, or color alone.",
		"Status meaning must remain available as text and must not rely only on badge color.",
	],
	prohibitedUsage: [
		"Do not use PageHeader for subsections, repeated cards, modal content, or embedded panels.",
		"Do not render multiple competing page-level headers on the same surface.",
		"Do not place filters, column controls, pagination, or dense toolbars inside PageHeader.",
		"Do not place unrelated record-level commands in PageHeader actions.",
		"Do not use SectionHeader as the primary page identity or as a replacement for field labels.",
		"Do not treat SectionHeader layout as sufficient section-heading semantics.",
		"Do not use EntityHeader for dashboards, list pages, reports, or generic workspace surfaces.",
		"Do not overload entity metadata with editable controls, long descriptions, or full record details.",
		"Do not use a non-authoritative Badge where an authoritative StatusBadge is required.",
	],
});
