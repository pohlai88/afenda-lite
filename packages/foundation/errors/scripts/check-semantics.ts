/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const TYPESCRIPT_SOURCE_PATTERN = /\.(?:cts|mts|ts|tsx)$/u;
const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const allowedPath = path.join(
	packageRoot,
	"__tests__",
	"ast-fixtures",
	"allowed",
	"static-public-messages.ts",
);
const rejectedPath = path.join(
	packageRoot,
	"__tests__",
	"ast-fixtures",
	"rejected",
	"dynamic-public-messages.ts",
);
const resultCapabilityPath = path.join(
	packageRoot,
	"src",
	"capabilities",
	"result.ts",
);
const ingressCapabilityPath = path.join(
	packageRoot,
	"src",
	"capabilities",
	"ingress.ts",
);
const registryPath = path.join(packageRoot, "src", "contract", "registry.ts");
const CAPABILITY_DECLARATIONS = Object.freeze([
	Object.freeze({
		exportName: "errorResult",
		methodName: "fail",
		sourcePath: resultCapabilityPath,
	}),
	Object.freeze({
		exportName: "errorIngress",
		methodName: "code",
		sourcePath: ingressCapabilityPath,
	}),
]);
const compilerOptions = Object.freeze({
	allowJs: false,
	module: ts.ModuleKind.Preserve,
	moduleResolution: ts.ModuleResolutionKind.Bundler,
	noEmit: true,
	skipLibCheck: true,
	strict: true,
	target: ts.ScriptTarget.ES2022,
});

function normalizedPath(fileName) {
	return path.resolve(fileName).replaceAll("\\", "/").toLowerCase();
}

function hasTypeFlag(type, flag) {
	// biome-ignore lint/suspicious/noBitwiseOperators: TypeScript exposes type flags as a bit mask.
	return (type.flags & flag) !== 0;
}

function propertyNameText(name) {
	if (
		ts.isIdentifier(name) ||
		ts.isStringLiteral(name) ||
		ts.isNumericLiteral(name)
	) {
		return name.text;
	}
	if (ts.isComputedPropertyName(name)) {
		const expression = unwrapExpression(name.expression);
		return ts.isStringLiteral(expression) ||
			ts.isNoSubstitutionTemplateLiteral(expression)
			? expression.text
			: undefined;
	}
}

function unwrapExpression(expression) {
	return ts.isParenthesizedExpression(expression) ||
		ts.isAsExpression(expression) ||
		ts.isSatisfiesExpression(expression) ||
		ts.isTypeAssertionExpression(expression)
		? unwrapExpression(expression.expression)
		: expression;
}

function sourceFileAt(program, fileName) {
	const expected = normalizedPath(fileName);
	return program
		.getSourceFiles()
		.find((sourceFile) => normalizedPath(sourceFile.fileName) === expected);
}

function isConstVariableDeclaration(declaration) {
	return (
		ts.isVariableDeclaration(declaration) &&
		ts.isVariableDeclarationList(declaration.parent) &&
		declaration.parent.flags === ts.NodeFlags.Const
	);
}

function createInspector(program) {
	const checker = program.getTypeChecker();

	function unaliasSymbol(symbol) {
		let current = symbol;
		const seen = new Set();
		while (
			current !== undefined &&
			current.flags === ts.SymbolFlags.Alias &&
			!seen.has(current)
		) {
			seen.add(current);
			try {
				const target = checker.getAliasedSymbol(current);
				if (target === current) {
					break;
				}
				current = target;
			} catch {
				break;
			}
		}
		return current;
	}

	function referenceSymbol(node) {
		if (
			ts.isIdentifier(node) &&
			ts.isShorthandPropertyAssignment(node.parent) &&
			node.parent.name === node
		) {
			return unaliasSymbol(
				checker.getShorthandAssignmentValueSymbol(node.parent),
			);
		}
		return unaliasSymbol(checker.getSymbolAtLocation(node));
	}

	function sameSymbol(left, right) {
		const resolvedLeft = unaliasSymbol(left);
		const resolvedRight = unaliasSymbol(right);
		if (resolvedLeft === undefined || resolvedRight === undefined) {
			return false;
		}
		if (resolvedLeft === resolvedRight) {
			return true;
		}
		const rightDeclarations = new Set(resolvedRight.declarations ?? []);
		return (resolvedLeft.declarations ?? []).some((declaration) =>
			rightDeclarations.has(declaration),
		);
	}

	function exportedSymbol(sourcePath, exportName) {
		const sourceFile = sourceFileAt(program, sourcePath);
		if (sourceFile === undefined) {
			throw new Error(`Capability source is absent: ${sourcePath}`);
		}
		const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
		if (moduleSymbol === undefined) {
			throw new Error(`Capability module has no symbol: ${sourcePath}`);
		}
		const exported = checker
			.getExportsOfModule(moduleSymbol)
			.find((symbol) => symbol.name === exportName);
		const resolved = unaliasSymbol(exported);
		if (resolved === undefined) {
			throw new Error(`Capability export is absent: ${exportName}`);
		}
		return resolved;
	}

	const capabilities = CAPABILITY_DECLARATIONS.map((declaration) => {
		const capabilitySymbol = exportedSymbol(
			declaration.sourcePath,
			declaration.exportName,
		);
		const symbolDeclaration =
			capabilitySymbol.valueDeclaration ?? capabilitySymbol.declarations?.[0];
		if (symbolDeclaration === undefined) {
			throw new Error(
				`Capability export has no declaration: ${declaration.exportName}`,
			);
		}
		const capabilityType = checker.getTypeOfSymbolAtLocation(
			capabilitySymbol,
			symbolDeclaration,
		);
		const methodSymbol = capabilityType.getProperty(declaration.methodName);
		if (methodSymbol === undefined) {
			throw new Error(
				`Capability method is absent: ${declaration.exportName}.${declaration.methodName}`,
			);
		}
		return Object.freeze({
			...declaration,
			capabilitySymbol,
			capabilityType,
			methodSymbol,
		});
	});

	function symbolTypeAt(symbol, fallbackDeclaration) {
		const declaration =
			symbol.valueDeclaration ??
			symbol.declarations?.[0] ??
			fallbackDeclaration;
		return checker.getTypeOfSymbolAtLocation(symbol, declaration);
	}

	function requiredPropertyType(
		ownerType,
		propertyName,
		policyPath,
		fallbackDeclaration,
	) {
		const propertySymbol = ownerType.getProperty(propertyName);
		if (propertySymbol === undefined) {
			throw new Error(`${policyPath} has no ${propertyName}.`);
		}
		return symbolTypeAt(propertySymbol, fallbackDeclaration);
	}

	function definitionMessagePolicy(definitionSymbol, registryDeclaration) {
		const definitionType = symbolTypeAt(definitionSymbol, registryDeclaration);
		const policyPath = `ERROR_REGISTRY.${definitionSymbol.name}`;
		const publicType = requiredPropertyType(
			definitionType,
			"public",
			policyPath,
			registryDeclaration,
		);
		const policyType = requiredPropertyType(
			publicType,
			"messagePolicy",
			policyPath,
			registryDeclaration,
		);
		if (!policyType.isStringLiteral()) {
			throw new Error(
				`${policyPath}.messagePolicy is not a literal machine policy.`,
			);
		}
		return policyType.value;
	}

	function recordDefinitionCopyPolicy(
		definitionSymbol,
		registryDeclaration,
		overrideCodes,
		fieldMessageProperties,
	) {
		const policy = definitionMessagePolicy(
			definitionSymbol,
			registryDeclaration,
		);
		if (policy === "sanitized-override") {
			overrideCodes.add(definitionSymbol.name);
		} else if (policy !== "fixed") {
			throw new Error(
				`ERROR_REGISTRY.${definitionSymbol.name} has unknown messagePolicy ${policy}.`,
			);
		}
		const definitionType = symbolTypeAt(definitionSymbol, registryDeclaration);
		const detailsType = requiredPropertyType(
			definitionType,
			"details",
			`ERROR_REGISTRY.${definitionSymbol.name}`,
			registryDeclaration,
		);
		const fieldPropertyType = requiredPropertyType(
			detailsType,
			"staticFieldMessageProperty",
			`ERROR_REGISTRY.${definitionSymbol.name}.details`,
			registryDeclaration,
		);
		if (fieldPropertyType.isStringLiteral()) {
			fieldMessageProperties.set(
				definitionSymbol.name,
				fieldPropertyType.value,
			);
		} else if (!hasTypeFlag(fieldPropertyType, ts.TypeFlags.Null)) {
			throw new Error(
				`ERROR_REGISTRY.${definitionSymbol.name}.details.staticFieldMessageProperty is not a literal machine policy.`,
			);
		}
	}

	function deriveRegistryCopyPolicies() {
		const registrySymbol = exportedSymbol(registryPath, "ERROR_REGISTRY");
		const registryDeclaration =
			registrySymbol.valueDeclaration ?? registrySymbol.declarations?.[0];
		if (registryDeclaration === undefined) {
			throw new Error("ERROR_REGISTRY has no machine-policy declaration.");
		}
		const registryType = checker.getTypeOfSymbolAtLocation(
			registrySymbol,
			registryDeclaration,
		);
		const definitions = checker.getPropertiesOfType(registryType);
		if (definitions.length === 0) {
			throw new Error("ERROR_REGISTRY exposes no canonical definitions.");
		}

		const overrideCodes = new Set();
		const staticFieldMessageProperties = new Map();
		for (const definitionSymbol of definitions) {
			recordDefinitionCopyPolicy(
				definitionSymbol,
				registryDeclaration,
				overrideCodes,
				staticFieldMessageProperties,
			);
		}
		if (overrideCodes.size === 0) {
			throw new Error("ERROR_REGISTRY has no sanitized-override policy.");
		}
		return { overrideCodes, staticFieldMessageProperties };
	}

	const {
		overrideCodes: publicMessageOverrideCodes,
		staticFieldMessageProperties,
	} = deriveRegistryCopyPolicies();

	function constInitializerForSymbol(symbol) {
		const resolved = unaliasSymbol(symbol);
		if (resolved === undefined) {
			return;
		}
		for (const declaration of resolved.declarations ?? []) {
			if (
				isConstVariableDeclaration(declaration) &&
				ts.isIdentifier(declaration.name) &&
				declaration.initializer !== undefined
			) {
				return declaration.initializer;
			}
		}
	}

	function resolveConstExpression(expression, seen = new Set()) {
		const unwrapped = unwrapExpression(expression);
		if (!ts.isIdentifier(unwrapped)) {
			return unwrapped;
		}
		const symbol = referenceSymbol(unwrapped);
		if (symbol === undefined || seen.has(symbol)) {
			return unwrapped;
		}
		const initializer = constInitializerForSymbol(symbol);
		if (initializer === undefined) {
			return unwrapped;
		}
		const nextSeen = new Set(seen);
		nextSeen.add(symbol);
		return resolveConstExpression(initializer, nextSeen);
	}

	function isStaticSourceText(expression) {
		const resolved = resolveConstExpression(expression);
		return ts.isStringLiteral(resolved);
	}

	function resolveCapabilityObject(expression, seen = new Set()) {
		const unwrapped = unwrapExpression(expression);
		if (
			ts.isIdentifier(unwrapped) ||
			ts.isPropertyAccessExpression(unwrapped) ||
			ts.isElementAccessExpression(unwrapped)
		) {
			const symbol = referenceSymbol(
				ts.isPropertyAccessExpression(unwrapped) ? unwrapped.name : unwrapped,
			);
			const capability = capabilities.find((candidate) =>
				sameSymbol(symbol, candidate.capabilitySymbol),
			);
			if (capability !== undefined) {
				return capability;
			}
			if (symbol === undefined || seen.has(symbol)) {
				return;
			}
			const initializer = constInitializerForSymbol(symbol);
			if (initializer === undefined) {
				return;
			}
			const nextSeen = new Set(seen);
			nextSeen.add(symbol);
			return resolveCapabilityObject(initializer, nextSeen);
		}
	}

	function accessName(expression) {
		if (ts.isPropertyAccessExpression(expression)) {
			return expression.name.text;
		}
		if (
			ts.isElementAccessExpression(expression) &&
			expression.argumentExpression !== undefined
		) {
			const argument = resolveConstExpression(expression.argumentExpression);
			if (
				ts.isStringLiteral(argument) ||
				ts.isNoSubstitutionTemplateLiteral(argument)
			) {
				return argument.text;
			}
			const argumentType = checker.getTypeAtLocation(
				expression.argumentExpression,
			);
			return argumentType.isStringLiteral() ? argumentType.value : undefined;
		}
	}

	function accessOwner(expression) {
		return ts.isPropertyAccessExpression(expression) ||
			ts.isElementAccessExpression(expression)
			? expression.expression
			: undefined;
	}

	function accessMethodSymbol(expression, methodName) {
		const directSymbol = ts.isPropertyAccessExpression(expression)
			? referenceSymbol(expression.name)
			: referenceSymbol(expression);
		if (directSymbol !== undefined) {
			return directSymbol;
		}
		const owner = accessOwner(expression);
		return owner === undefined
			? undefined
			: unaliasSymbol(checker.getTypeAtLocation(owner).getProperty(methodName));
	}

	function resolveCapabilityPropertyAccess(expression) {
		const unwrapped = unwrapExpression(expression);
		const owner = accessOwner(unwrapped);
		const propertyName = accessName(unwrapped);
		if (owner === undefined || propertyName === undefined) {
			return;
		}
		const capability = resolveCapabilityObject(owner);
		const expectedProperty =
			capability?.capabilityType.getProperty(propertyName);
		if (
			capability !== undefined &&
			expectedProperty !== undefined &&
			sameSymbol(accessMethodSymbol(unwrapped, propertyName), expectedProperty)
		) {
			return capability;
		}
	}

	function capabilityFromBindingDeclaration(declaration, seen) {
		if (!ts.isBindingElement(declaration)) {
			return;
		}
		const bindingPattern = declaration.parent;
		if (!ts.isObjectBindingPattern(bindingPattern)) {
			return;
		}
		const variableDeclaration = bindingPattern.parent;
		if (
			!(
				ts.isVariableDeclaration(variableDeclaration) &&
				isConstVariableDeclaration(variableDeclaration)
			) ||
			variableDeclaration.initializer === undefined
		) {
			return;
		}
		const propertyName = propertyNameText(
			declaration.propertyName ?? declaration.name,
		);
		const capability = resolveCapabilityObject(
			variableDeclaration.initializer,
			seen,
		);
		return capability !== undefined && propertyName === capability.methodName
			? capability
			: undefined;
	}

	function destructuredCapabilityForSymbol(symbol, seen) {
		const resolvedSymbol = unaliasSymbol(symbol);
		for (const declaration of resolvedSymbol?.declarations ?? []) {
			const capability = capabilityFromBindingDeclaration(declaration, seen);
			if (capability !== undefined) {
				return capability;
			}
		}
	}

	function resolveCapabilityInvocation(expression, seen = new Set()) {
		const unwrapped = unwrapExpression(expression);
		const owner = accessOwner(unwrapped);
		if (owner !== undefined) {
			const capability = resolveCapabilityPropertyAccess(unwrapped);
			if (
				capability !== undefined &&
				accessName(unwrapped) === capability.methodName &&
				sameSymbol(
					accessMethodSymbol(unwrapped, capability.methodName),
					capability.methodSymbol,
				)
			) {
				return capability;
			}
			return;
		}

		if (!ts.isIdentifier(unwrapped)) {
			return;
		}
		const symbol = referenceSymbol(unwrapped);
		if (symbol === undefined || seen.has(symbol)) {
			return;
		}
		const destructuredCapability = destructuredCapabilityForSymbol(
			symbol,
			seen,
		);
		if (destructuredCapability !== undefined) {
			return destructuredCapability;
		}
		const initializer = constInitializerForSymbol(symbol);
		if (initializer === undefined) {
			return;
		}
		const nextSeen = new Set(seen);
		nextSeen.add(symbol);
		return resolveCapabilityInvocation(initializer, nextSeen);
	}

	function emptyObjectAnalysis(resolvedObject = true) {
		return { expressions: [], resolvedObject, unresolved: [] };
	}

	function publicMessageAnalysisForProperty(property) {
		if (
			ts.isPropertyAssignment(property) &&
			propertyNameText(property.name) === "publicMessage"
		) {
			return {
				expressions: [property.initializer],
				resolvedObject: true,
				unresolved: [],
			};
		}
		if (
			ts.isShorthandPropertyAssignment(property) &&
			property.name.text === "publicMessage"
		) {
			return {
				expressions: [property.name],
				resolvedObject: true,
				unresolved: [],
			};
		}
		if (ts.isSpreadAssignment(property)) {
			return {
				expressions: [],
				resolvedObject: true,
				unresolved: [
					{
						kind: "InputSpreadAssignment",
						node: property,
					},
				],
			};
		}

		const name =
			"name" in property ? propertyNameText(property.name) : undefined;
		return name === undefined || name === "publicMessage"
			? {
					expressions: [],
					resolvedObject: true,
					unresolved: [{ kind: "UnresolvedObjectProperty", node: property }],
				}
			: emptyObjectAnalysis();
	}

	function collectPublicMessageAnalysis(input) {
		const unwrapped = unwrapExpression(input);
		if (!ts.isObjectLiteralExpression(unwrapped)) {
			return {
				expressions: [],
				resolvedObject: false,
				unresolved: [
					{
						kind: "NonInlineCapabilityInput",
						node: unwrapped,
					},
				],
			};
		}
		const analyses = unwrapped.properties.map((property) =>
			publicMessageAnalysisForProperty(property),
		);
		return {
			expressions: analyses.flatMap((analysis) => analysis.expressions),
			resolvedObject: true,
			unresolved: analyses.flatMap((analysis) => analysis.unresolved),
		};
	}

	function isUndefinedExpression(expression) {
		const resolved = resolveConstExpression(expression);
		if (resolved.kind === ts.SyntaxKind.VoidExpression) {
			return true;
		}
		if (!ts.isIdentifier(resolved) || resolved.text !== "undefined") {
			return false;
		}
		return hasTypeFlag(
			checker.getTypeAtLocation(resolved),
			ts.TypeFlags.Undefined,
		);
	}

	function collectNamedPropertyAnalysis(input, propertyName) {
		const unwrapped = unwrapExpression(input);
		if (!ts.isObjectLiteralExpression(unwrapped)) {
			return {
				unresolved: [{ kind: "NonInlineCapabilityInput", node: unwrapped }],
				values: [],
			};
		}

		const unresolved: Array<{ kind: string; node: ts.Node }> = [];
		const values: ts.Expression[] = [];
		for (const property of unwrapped.properties) {
			if (
				ts.isPropertyAssignment(property) &&
				propertyNameText(property.name) === propertyName
			) {
				values.push(property.initializer);
				continue;
			}
			if (
				ts.isShorthandPropertyAssignment(property) &&
				property.name.text === propertyName
			) {
				values.push(property.name);
				continue;
			}
			if (ts.isSpreadAssignment(property)) {
				unresolved.push({
					kind: "FieldInputSpreadAssignment",
					node: property,
				});
				continue;
			}
			if ("name" in property && propertyNameText(property.name) === undefined) {
				unresolved.push({
					kind: "UnresolvedFieldErrorsInput",
					node: property,
				});
			}
		}
		return { unresolved, values };
	}

	function collectFieldMessageArray(expression) {
		const unwrapped = unwrapExpression(expression);
		if (isUndefinedExpression(unwrapped)) {
			return { expressions: [], unresolved: [] };
		}
		if (!ts.isArrayLiteralExpression(unwrapped)) {
			return {
				expressions: [],
				unresolved: [{ kind: "NonInlineFieldMessageArray", node: unwrapped }],
			};
		}

		const expressions: ts.Expression[] = [];
		const unresolved: Array<{ kind: string; node: ts.Node }> = [];
		for (const element of unwrapped.elements) {
			if (ts.isOmittedExpression(element) || isUndefinedExpression(element)) {
				continue;
			}
			if (ts.isSpreadElement(element)) {
				unresolved.push({
					kind: "FieldMessageSpreadElement",
					node: element,
				});
				continue;
			}
			expressions.push(element);
		}
		return { expressions, unresolved };
	}

	function isStaticFieldPropertyName(name) {
		if (!ts.isComputedPropertyName(name)) {
			return propertyNameText(name) !== undefined;
		}
		const resolved = resolveConstExpression(name.expression);
		return ts.isStringLiteral(resolved) || ts.isNumericLiteral(resolved);
	}

	function collectFieldErrorsProperty(property) {
		if (ts.isSpreadAssignment(property)) {
			return {
				expressions: [],
				unresolved: [
					{
						kind: "FieldErrorsSpreadAssignment",
						node: property,
					},
				],
			};
		}
		if (
			!(
				ts.isPropertyAssignment(property) ||
				ts.isShorthandPropertyAssignment(property)
			)
		) {
			return {
				expressions: [],
				unresolved: [
					{
						kind: "UnresolvedFieldErrorsProperty",
						node: property,
					},
				],
			};
		}
		const messages = collectFieldMessageArray(
			ts.isPropertyAssignment(property) ? property.initializer : property.name,
		);
		return isStaticFieldPropertyName(property.name)
			? messages
			: {
					expressions: messages.expressions,
					unresolved: [
						...messages.unresolved,
						{ kind: "DynamicFieldName", node: property.name },
					],
				};
	}

	function collectFieldErrorsObject(expression) {
		const expressions: ts.Expression[] = [];
		const unresolved: Array<{ kind: string; node: ts.Node }> = [];
		const unwrapped = unwrapExpression(expression);
		if (isUndefinedExpression(unwrapped)) {
			return { expressions, unresolved };
		}
		if (!ts.isObjectLiteralExpression(unwrapped)) {
			return {
				expressions,
				unresolved: [{ kind: "NonInlineFieldErrorsObject", node: unwrapped }],
			};
		}

		for (const property of unwrapped.properties) {
			const propertyAnalysis = collectFieldErrorsProperty(property);
			expressions.push(...propertyAnalysis.expressions);
			unresolved.push(...propertyAnalysis.unresolved);
		}
		return { expressions, unresolved };
	}

	function collectFieldMessageAnalysis(input, propertyName) {
		const fieldErrors = collectNamedPropertyAnalysis(input, propertyName);
		const expressions: ts.Expression[] = [];
		const unresolved = [...fieldErrors.unresolved];
		for (const fieldErrorsExpression of fieldErrors.values) {
			const fieldObject = collectFieldErrorsObject(fieldErrorsExpression);
			expressions.push(...fieldObject.expressions);
			unresolved.push(...fieldObject.unresolved);
		}
		return { expressions, unresolved };
	}

	function expressionKindName(expression) {
		const unwrapped = unwrapExpression(expression);
		return ts.isNoSubstitutionTemplateLiteral(unwrapped)
			? "NoSubstitutionTemplateLiteral"
			: ts.SyntaxKind[unwrapped.kind];
	}

	function resolvedCodeText(expression) {
		const resolved = resolveConstExpression(expression);
		if (ts.isStringLiteral(resolved)) {
			return resolved.text;
		}
		const expressionType = checker.getTypeAtLocation(expression);
		return expressionType.isStringLiteral() ? expressionType.value : undefined;
	}

	function isCapabilityValueNode(node) {
		return (
			ts.isIdentifier(node) ||
			ts.isPropertyAccessExpression(node) ||
			ts.isElementAccessExpression(node)
		);
	}

	function isAccessPropertyName(node) {
		return (
			ts.isIdentifier(node) &&
			((ts.isPropertyAccessExpression(node.parent) &&
				node.parent.name === node) ||
				(ts.isElementAccessExpression(node.parent) &&
					node.parent.argumentExpression === node))
		);
	}

	function isCapabilityDeclaration(node, parent) {
		return (
			ts.isIdentifier(node) &&
			((ts.isVariableDeclaration(parent) && parent.name === node) ||
				ts.isImportSpecifier(parent) ||
				ts.isExportSpecifier(parent) ||
				ts.isImportClause(parent) ||
				ts.isNamespaceImport(parent))
		);
	}

	function isGovernedDestructureOwner(node, parent, capability) {
		return (
			ts.isVariableDeclaration(parent) &&
			parent.initializer === node &&
			ts.isObjectBindingPattern(parent.name) &&
			parent.name.elements.some(
				(element) =>
					propertyNameText(element.propertyName ?? element.name) ===
					capability.methodName,
			)
		);
	}

	function isTestCapabilityInspection(node, parent, sourceFile) {
		if (
			!(
				sourceFile.fileName.replaceAll("\\", "/").includes("/__tests__/") &&
				ts.isCallExpression(parent) &&
				parent.arguments.includes(node)
			)
		) {
			return false;
		}
		return (
			(ts.isIdentifier(parent.expression) &&
				parent.expression.text === "expect") ||
			(ts.isPropertyAccessExpression(parent.expression) &&
				parent.expression.expression.getText(sourceFile) === "Object" &&
				parent.expression.name.text === "isFrozen")
		);
	}

	function isAllowedCapabilityObjectUse(node, capability, sourceFile) {
		const { parent } = node;
		if (isCapabilityDeclaration(node, parent)) {
			return true;
		}
		const isAccessOwner =
			(ts.isPropertyAccessExpression(parent) ||
				ts.isElementAccessExpression(parent)) &&
			parent.expression === node;
		const isDirectCallOwner =
			isAccessOwner &&
			ts.isCallExpression(parent.parent) &&
			parent.parent.expression === parent &&
			resolveCapabilityPropertyAccess(parent) === capability;
		const isGovernedMethodOwner =
			isAccessOwner && resolveCapabilityInvocation(parent) === capability;
		return (
			isDirectCallOwner ||
			isGovernedMethodOwner ||
			isGovernedDestructureOwner(node, parent, capability) ||
			isTestCapabilityInspection(node, parent, sourceFile)
		);
	}

	function inspectSource(sourceFile) {
		const findings: Array<{
			column: number;
			fileName: string;
			kind: string;
			line: number;
			message: string;
		}> = [];
		let capabilityCalls = 0;
		let fieldMessages = 0;
		let publicMessages = 0;

		function addFinding(node, kind, message) {
			const position = sourceFile.getLineAndCharacterOfPosition(
				node.getStart(),
			);
			findings.push({
				column: position.character + 1,
				fileName: sourceFile.fileName,
				kind,
				line: position.line + 1,
				message,
			});
		}

		function inspectCapabilityCall(node) {
			const capability = resolveCapabilityInvocation(node.expression);
			if (capability === undefined) {
				return { calls: 0, fieldMessages: 0, messages: 0 };
			}
			const [code, input] = node.arguments;
			const codeText = code && resolvedCodeText(code);
			if (code !== undefined && codeText === undefined) {
				addFinding(
					code,
					"UnresolvedCanonicalCode",
					"error construction code must resolve to one canonical string-literal type",
				);
			}
			const requiresPublicMessageProof =
				codeText !== undefined && publicMessageOverrideCodes.has(codeText);
			const analysis =
				requiresPublicMessageProof && input !== undefined
					? collectPublicMessageAnalysis(input)
					: emptyObjectAnalysis();
			reportMissingPublicMessage(
				node,
				capability,
				codeText,
				analysis.expressions,
				analysis.unresolved,
			);
			reportDynamicPublicMessages(analysis.expressions);
			reportUnresolvedObjectInputs(analysis.unresolved);
			const staticFieldMessageProperty =
				codeText === undefined
					? undefined
					: staticFieldMessageProperties.get(codeText);
			const fieldAnalysis =
				staticFieldMessageProperty !== undefined && input !== undefined
					? collectFieldMessageAnalysis(input, staticFieldMessageProperty)
					: { expressions: [], unresolved: [] };
			reportDynamicFieldMessages(fieldAnalysis.expressions);
			reportUnresolvedFieldErrors(fieldAnalysis.unresolved);
			return {
				calls: 1,
				fieldMessages: fieldAnalysis.expressions.length,
				messages: analysis.expressions.length,
			};
		}

		function reportCapabilityMethodRebinding(node) {
			if (
				ts.isVariableDeclaration(node) &&
				ts.isObjectBindingPattern(node.name) &&
				node.initializer !== undefined
			) {
				const capability = resolveCapabilityObject(node.initializer);
				const extractsMethod = node.name.elements.some(
					(element) =>
						propertyNameText(element.propertyName ?? element.name) ===
						capability?.methodName,
				);
				if (capability !== undefined && extractsMethod) {
					addFinding(
						node,
						"CapabilityMethodRebinding",
						"error capability methods must be invoked from their named capability object, not destructured",
					);
				}
			}
			if (
				(ts.isPropertyAccessExpression(node) ||
					ts.isElementAccessExpression(node)) &&
				resolveCapabilityInvocation(node) !== undefined &&
				!(ts.isCallExpression(node.parent) && node.parent.expression === node)
			) {
				addFinding(
					node,
					"CapabilityMethodRebinding",
					"error capability methods cannot be stored, assigned, wrapped, or passed as values",
				);
			}
		}

		function reportCapabilityObjectRebinding(node) {
			if (!isCapabilityValueNode(node) || isAccessPropertyName(node)) {
				return;
			}
			const capability = resolveCapabilityObject(node);
			if (
				capability === undefined ||
				isAllowedCapabilityObjectUse(node, capability, sourceFile)
			) {
				return;
			}
			addFinding(
				node,
				"CapabilityObjectRebinding",
				`${capability.exportName} must remain the direct owner of its method call and cannot be stored, wrapped, or passed as a value`,
			);
		}

		function reportMissingPublicMessage(
			node,
			capability,
			codeText,
			expressions,
			unresolved,
		) {
			if (
				codeText !== undefined &&
				publicMessageOverrideCodes.has(codeText) &&
				unresolved.length === 0 &&
				expressions.length !== 1
			) {
				addFinding(
					node,
					"MissingOrUnresolvedPublicMessage",
					`${capability.exportName}.${capability.methodName}(${codeText}) must expose one statically resolvable publicMessage`,
				);
			}
		}

		function reportDynamicPublicMessages(expressions) {
			for (const expression of expressions) {
				if (!isStaticSourceText(expression)) {
					addFinding(
						expression,
						expressionKindName(expression),
						"publicMessage must resolve through const-only aliases to static source text",
					);
				}
			}
		}

		function reportDynamicFieldMessages(expressions) {
			for (const expression of expressions) {
				if (!isStaticSourceText(expression)) {
					addFinding(
						expression,
						expressionKindName(expression),
						"fieldErrors messages must resolve through const-only aliases to static source text",
					);
				}
			}
		}

		function reportUnresolvedObjectInputs(unresolved) {
			for (const finding of unresolved) {
				addFinding(
					finding.node,
					finding.kind,
					"copy-bearing capability inputs must be inline object literals without spreads or unresolved computed properties",
				);
			}
		}

		function reportUnresolvedFieldErrors(unresolved) {
			for (const finding of unresolved) {
				addFinding(
					finding.node,
					finding.kind,
					"fieldErrors objects and message arrays must be inline literals without spreads; only primitive authored constants may be reused",
				);
			}
		}

		function visit(node) {
			reportCapabilityMethodRebinding(node);
			reportCapabilityObjectRebinding(node);
			if (ts.isCallExpression(node)) {
				const inspected = inspectCapabilityCall(node);
				capabilityCalls += inspected.calls;
				fieldMessages += inspected.fieldMessages;
				publicMessages += inspected.messages;
			}
			ts.forEachChild(node, visit);
		}

		visit(sourceFile);
		return { capabilityCalls, fieldMessages, findings, publicMessages };
	}

	return Object.freeze({ inspectSource });
}

async function TypeScriptFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const nestedFiles = await Promise.all(
		entries.map((entry) => {
			const absolutePath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				if (entry.name === "node_modules" || entry.name === "dist") {
					return [];
				}
				return TypeScriptFiles(absolutePath);
			}
			return entry.isFile() && TYPESCRIPT_SOURCE_PATTERN.test(entry.name)
				? [absolutePath]
				: [];
		}),
	);
	return nestedFiles.flat();
}

function isRejectedFixture(fileName) {
	const normalized = fileName.replaceAll("\\", "/");
	return (
		normalized.includes("/__tests__/ast-fixtures/rejected/") ||
		normalized.includes("/__tests__/type-fixtures/rejected/")
	);
}

function requiredSourceFile(program, fileName) {
	const sourceFile = sourceFileAt(program, fileName);
	if (sourceFile === undefined) {
		throw new Error(`TypeScript Program omitted ${fileName}`);
	}
	return sourceFile;
}

const allFiles = await TypeScriptFiles(packageRoot);
const mainProgram = ts.createProgram({
	options: compilerOptions,
	rootNames: allFiles,
});
const inspector = createInspector(mainProgram);
const enforcedFiles = allFiles.filter(
	(fileName) => !isRejectedFixture(fileName),
);
const enforcedResults = enforcedFiles.map((fileName) =>
	inspector.inspectSource(requiredSourceFile(mainProgram, fileName)),
);
const enforcementFindings = enforcedResults.flatMap(
	(result) => result.findings,
);
if (enforcementFindings.length > 0) {
	throw new Error(
		enforcementFindings
			.map(
				(finding) =>
					`${path.relative(packageRoot, finding.fileName)}:${finding.line}:${finding.column} [${finding.kind}] ${finding.message}`,
			)
			.join("\n"),
	);
}

const allowedResult = inspector.inspectSource(
	requiredSourceFile(mainProgram, allowedPath),
);
if (
	allowedResult.findings.length > 0 ||
	allowedResult.publicMessages !== 3 ||
	allowedResult.fieldMessages !== 1
) {
	throw new Error(
		`Call-site classifier rejected an allowed static public-message fixture: ${allowedResult.findings.length} findings, ${allowedResult.publicMessages} public messages, ${allowedResult.fieldMessages} field messages (${allowedResult.findings.map((finding) => finding.kind).join(", ")}).`,
	);
}

const rejectedResult = inspector.inspectSource(
	requiredSourceFile(mainProgram, rejectedPath),
);
if (
	rejectedResult.findings.length !== 28 ||
	rejectedResult.publicMessages !== 18 ||
	rejectedResult.fieldMessages !== 4
) {
	throw new Error(
		`Call-site classifier fixture drift: ${rejectedResult.findings.length} findings, ${rejectedResult.publicMessages} public messages, ${rejectedResult.fieldMessages} field messages (${rejectedResult.findings.map((finding) => finding.kind).join(", ")}).`,
	);
}

const expectedRejectedKinds = new Map([
	["BinaryExpression", 2],
	["CallExpression", 5],
	["CapabilityObjectRebinding", 3],
	["CapabilityMethodRebinding", 6],
	["DynamicFieldName", 1],
	["Identifier", 2],
	["InputSpreadAssignment", 1],
	["NonInlineCapabilityInput", 1],
	["NonInlineFieldErrorsObject", 1],
	["NonInlineFieldMessageArray", 1],
	["NoSubstitutionTemplateLiteral", 1],
	["PropertyAccessExpression", 1],
	["TemplateExpression", 3],
]);
const rejectedKindCounts = new Map();
for (const finding of rejectedResult.findings) {
	rejectedKindCounts.set(
		finding.kind,
		(rejectedKindCounts.get(finding.kind) ?? 0) + 1,
	);
}
for (const [requiredKind, expectedCount] of expectedRejectedKinds) {
	if (rejectedKindCounts.get(requiredKind) !== expectedCount) {
		throw new Error(
			`Rejected public-message fixture drift: ${requiredKind} must occur ${expectedCount} time(s).`,
		);
	}
}
if (rejectedKindCounts.size !== expectedRejectedKinds.size) {
	throw new Error(
		"Rejected public-message fixture produced an unknown finding.",
	);
}

const shadowingFixturePath = path.join(
	packageRoot,
	"__tests__",
	"ast-fixtures",
	"symbol-shadowing.ts",
);
const shadowingFixtureSource = `
import { errorResult as actualErrorResult } from "../../src/index";

declare function runtimeMessage(): string;

const SHARED_MESSAGE = runtimeMessage();
actualErrorResult.fail("NOT_FOUND", { publicMessage: "Root static text" });
actualErrorResult.fail("CONFLICT", { publicMessage: "Method static text" });
actualErrorResult.fail("VALIDATION_ERROR", {
	publicMessage: "Statically proven validation text",
});

{
	const SHARED_MESSAGE = "Lexically scoped static text";
	actualErrorResult.fail("BAD_REQUEST", { publicMessage: SHARED_MESSAGE });
}

function shadowedCapability(
	actualErrorResult: { fail: (...arguments_: unknown[]) => unknown },
): void {
	actualErrorResult.fail("NOT_FOUND", { publicMessage: SHARED_MESSAGE });
}

shadowedCapability({ fail: () => undefined });
`;
const host = ts.createCompilerHost(compilerOptions);
const hostFileExists = host.fileExists.bind(host);
const hostReadFile = host.readFile.bind(host);
const hostGetSourceFile = host.getSourceFile.bind(host);
const normalizedShadowingPath = normalizedPath(shadowingFixturePath);
host.fileExists = (fileName) =>
	normalizedPath(fileName) === normalizedShadowingPath ||
	hostFileExists(fileName);
host.readFile = (fileName) =>
	normalizedPath(fileName) === normalizedShadowingPath
		? shadowingFixtureSource
		: hostReadFile(fileName);
host.getSourceFile = (
	fileName,
	languageVersion,
	onError,
	shouldCreateNewSourceFile,
) =>
	normalizedPath(fileName) === normalizedShadowingPath
		? ts.createSourceFile(
				fileName,
				shadowingFixtureSource,
				languageVersion,
				true,
				ts.ScriptKind.TS,
			)
		: hostGetSourceFile(
				fileName,
				languageVersion,
				onError,
				shouldCreateNewSourceFile,
			);
const shadowingProgram = ts.createProgram({
	host,
	options: compilerOptions,
	rootNames: [...allFiles, shadowingFixturePath],
});
const shadowingResult = createInspector(shadowingProgram).inspectSource(
	requiredSourceFile(shadowingProgram, shadowingFixturePath),
);
if (
	shadowingResult.findings.length !== 0 ||
	shadowingResult.capabilityCalls !== 4 ||
	shadowingResult.publicMessages !== 4
) {
	throw new Error(
		"Symbol-aware classifier failed its lexical-shadowing regression fixture.",
	);
}

const enforcedCalls = enforcedResults.reduce(
	(total, result) => total + result.capabilityCalls,
	0,
);
const enforcedMessages = enforcedResults.reduce(
	(total, result) => total + result.publicMessages,
	0,
);
const enforcedFieldMessages = enforcedResults.reduce(
	(total, result) => total + result.fieldMessages,
	0,
);
process.stdout.write(
	`Lane 1 call-site copy gate accepted ${enforcedMessages} public messages and ${enforcedFieldMessages} field messages across ${enforcedCalls} capability calls; 28 unsafe fixtures rejected.\n`,
);
