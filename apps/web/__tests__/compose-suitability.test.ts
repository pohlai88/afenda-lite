/**
 * Suitability gates (C1–C3) — TypeScript JSX AST checks for high-risk misuse.
 * Keep IDs / approved patterns aligned with afenda-elite-ui-compose skill + reference.
 * Scope: product TSX only (auth island allowlisted via compose-scan).
 *
 * Intentionally narrow — do not expand into a full composition linter without an Approved slice.
 */

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { productTsx } from "./compose-scan";

const LINK_TAGS = new Set(["Link", "NextLink"]);

function tagName(
	node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
): string | null {
	const tag = node.tagName;
	if (ts.isIdentifier(tag)) {
		return tag.text;
	}
	if (ts.isPropertyAccessExpression(tag) && ts.isIdentifier(tag.name)) {
		return tag.name.text;
	}
	return null;
}

function attrNamed(
	attrs: ts.JsxAttributes,
	name: string,
): ts.JsxAttribute | undefined {
	for (const prop of attrs.properties) {
		if (
			ts.isJsxAttribute(prop) &&
			ts.isIdentifier(prop.name) &&
			prop.name.text === name
		) {
			return prop;
		}
	}
	return undefined;
}

function attrStringValue(attr: ts.JsxAttribute | undefined): string | null {
	if (!attr?.initializer) {
		return null;
	}
	if (ts.isStringLiteral(attr.initializer)) {
		return attr.initializer.text;
	}
	if (
		ts.isJsxExpression(attr.initializer) &&
		attr.initializer.expression &&
		ts.isStringLiteral(attr.initializer.expression)
	) {
		return attr.initializer.expression.text;
	}
	return null;
}

function hasAttr(attrs: ts.JsxAttributes, name: string): boolean {
	return attrNamed(attrs, name) !== undefined;
}

function walkJsx(
	sourceFile: ts.SourceFile,
	visitOpening: (
		opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
		ancestors: string[],
	) => void,
): void {
	const ancestors: string[] = [];

	const visit = (node: ts.Node) => {
		if (ts.isJsxSelfClosingElement(node)) {
			const name = tagName(node);
			if (name) {
				visitOpening(node, ancestors);
			}
			return;
		}
		if (ts.isJsxElement(node)) {
			const name = tagName(node.openingElement);
			if (name) {
				visitOpening(node.openingElement, ancestors);
				ancestors.push(name);
				for (const child of node.children) {
					visit(child);
				}
				ancestors.pop();
				return;
			}
		}
		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
}

function directChildTagNames(element: ts.JsxElement): string[] {
	const names: string[] = [];
	for (const child of element.children) {
		if (ts.isJsxElement(child)) {
			const name = tagName(child.openingElement);
			if (name) names.push(name);
		} else if (ts.isJsxSelfClosingElement(child)) {
			const name = tagName(child);
			if (name) names.push(name);
		} else if (ts.isJsxExpression(child) && child.expression) {
			// Skip expressions; navigation Link must be a direct JSX child for C2.
		}
	}
	return names;
}

function findButtonElements(sourceFile: ts.SourceFile): ts.JsxElement[] {
	const buttons: ts.JsxElement[] = [];
	const visit = (node: ts.Node) => {
		if (ts.isJsxElement(node) && tagName(node.openingElement) === "Button") {
			buttons.push(node);
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return buttons;
}

describe("@afenda/web compose suitability (afenda-elite-ui-compose C1–C3)", () => {
	it("C1 — destructive confirmation must use AlertDialog (not Dialog)", () => {
		const offenders: string[] = [];

		for (const { rel, src } of productTsx()) {
			const sourceFile = ts.createSourceFile(
				rel,
				src,
				ts.ScriptTarget.Latest,
				true,
				ts.ScriptKind.TSX,
			);

			walkJsx(sourceFile, (opening, ancestors) => {
				const name = tagName(opening);
				if (name !== "Button") {
					return;
				}
				const variant = attrStringValue(
					attrNamed(opening.attributes, "variant"),
				);
				if (variant !== "destructive") {
					return;
				}
				const inDialog = ancestors.includes("Dialog");
				const inAlertDialog = ancestors.some((a) =>
					a.startsWith("AlertDialog"),
				);
				if (inDialog && !inAlertDialog) {
					offenders.push(`${rel}: Button variant=destructive inside Dialog`);
				}
			});
		}

		expect(offenders, `C1 Dialog misuse: ${offenders.join("; ")}`).toEqual([]);
	});

	it("C2 — navigation Button with Link child must set asChild", () => {
		const offenders: string[] = [];

		for (const { rel, src } of productTsx()) {
			const sourceFile = ts.createSourceFile(
				rel,
				src,
				ts.ScriptTarget.Latest,
				true,
				ts.ScriptKind.TSX,
			);

			for (const button of findButtonElements(sourceFile)) {
				const childTags = directChildTagNames(button);
				const hasLinkChild = childTags.some((t) => LINK_TAGS.has(t));
				if (!hasLinkChild) {
					continue;
				}
				if (!hasAttr(button.openingElement.attributes, "asChild")) {
					offenders.push(`${rel}: Button>Link without asChild`);
				}
			}
		}

		expect(offenders, `C2 nav Button: ${offenders.join("; ")}`).toEqual([]);
	});

	it("C3 — Card root must not be the interactive target", () => {
		/**
		 * Approved interactive patterns (Card itself stays non-interactive):
		 * - Put Button / Link / DropdownMenu inside Card
		 * - Do not put onClick, role="button", or tabIndex on Card
		 * Card has no asChild Slot today — clickable Card shells are not approved.
		 */
		const offenders: string[] = [];

		for (const { rel, src } of productTsx()) {
			const sourceFile = ts.createSourceFile(
				rel,
				src,
				ts.ScriptTarget.Latest,
				true,
				ts.ScriptKind.TSX,
			);

			walkJsx(sourceFile, (opening) => {
				if (tagName(opening) !== "Card") {
					return;
				}
				const attrs = opening.attributes;
				if (hasAttr(attrs, "onClick")) {
					offenders.push(`${rel}: Card onClick`);
					return;
				}
				const role = attrStringValue(attrNamed(attrs, "role"));
				if (role === "button") {
					offenders.push(`${rel}: Card role=button`);
					return;
				}
				const tabIndex = attrNamed(attrs, "tabIndex");
				if (tabIndex) {
					const value = attrStringValue(tabIndex);
					const expr = tabIndex.initializer;
					const isZero =
						value === "0" ||
						(expr &&
							ts.isJsxExpression(expr) &&
							expr.expression &&
							ts.isNumericLiteral(expr.expression) &&
							expr.expression.text === "0");
					if (isZero) {
						offenders.push(`${rel}: Card tabIndex=0`);
					}
				}
			});
		}

		expect(offenders, `C3 interactive Card: ${offenders.join("; ")}`).toEqual(
			[],
		);
	});
});
