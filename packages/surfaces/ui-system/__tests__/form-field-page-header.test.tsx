import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormField } from "../src/components/ui/form-field";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
} from "../src/components/ui/page-header";

describe("governed FormField and PageHeader semantics", () => {
	it("associates FormField labels, guidance, and correction with one control", () => {
		const html = renderToStaticMarkup(
			<FormField
				description="Use the identifier issued by the tax authority."
				error="Tax registration number is required."
				fieldId="supplier-tax-id"
				label="Tax registration number"
				required
			>
				<input />
			</FormField>,
		);

		expect(html).toContain('for="supplier-tax-id"');
		expect(html).toContain('id="supplier-tax-id"');
		expect(html).toContain('aria-invalid="true"');
		expect(html).toContain(
			'aria-describedby="supplier-tax-id-description supplier-tax-id-error"',
		);
		expect(html).toContain("Tax registration number is required.");
	});

	it("keeps PageHeader identity and actions in separate semantic regions", () => {
		const html = renderToStaticMarkup(
			<PageHeader aria-labelledby="invoice-page-title">
				<div>
					<PageHeaderHeading id="invoice-page-title">
						Supplier invoices
					</PageHeaderHeading>
					<PageHeaderDescription>
						Review approval and posting readiness.
					</PageHeaderDescription>
				</div>
				<PageHeaderActions>
					<button type="button">New invoice</button>
				</PageHeaderActions>
			</PageHeader>,
		);

		expect(html.match(/<h1/g)).toHaveLength(1);
		expect(html).toContain('aria-labelledby="invoice-page-title"');
		expect(html).toContain('data-slot="page-header-actions"');
		expect(html).toContain("New invoice");
	});
});
