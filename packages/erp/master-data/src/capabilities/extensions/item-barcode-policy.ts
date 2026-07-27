import { fail, ok, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../../contracts/reasons";

export const ITEM_BARCODE_SYMBOLOGIES = [
	"EAN_8",
	"EAN_13",
	"UPC_A",
	"UPC_E",
	"GTIN_14",
	"CODE_128",
	"QR",
	"INTERNAL",
	"OTHER",
] as const;

export type ItemBarcodeSymbology = (typeof ITEM_BARCODE_SYMBOLOGIES)[number];

export const MAX_ITEM_BARCODE_VALUE_LENGTH = 512 as const;
export const MAX_ITEM_BARCODE_PACK_QUANTITY_SCALE = 12 as const;

const ITEM_BARCODE_SYMBOLOGY_SET: ReadonlySet<string> = new Set(
	ITEM_BARCODE_SYMBOLOGIES,
);

const NUMERIC_LENGTH_BY_SYMBOLOGY = {
	EAN_8: 8,
	EAN_13: 13,
	UPC_A: 12,
	GTIN_14: 14,
} as const;

const NUMERIC_BARCODE_SEPARATOR_RE = /[\s-]/gu;
const NUMERIC_BARCODE_RE = /^[0-9]+$/u;
const UPC_E_RE = /^[01][0-9]{7}$/u;
const CODE_128_VALUE_RE = /^[\x20-\x7E]+$/u;
const CONTROL_CHARACTER_RE = /\p{Cc}/u;
const UNSAFE_INVISIBLE_CHARACTER_RE =
	/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/u;
const PACK_QUANTITY_RE = /^(\d+)(?:\.(\d+))?$/u;

export type NormalizedItemBarcode = Readonly<{
	barcodeValue: string;
	normalizedValue: string;
}>;

export function normalizeBarcode(input: {
	rawValue: string;
	symbology: ItemBarcodeSymbology;
}): Result<NormalizedItemBarcode> {
	if (typeof input.rawValue !== "string") {
		return invalidBarcode("Barcode value must be a string");
	}
	if (!ITEM_BARCODE_SYMBOLOGY_SET.has(input.symbology)) {
		return invalidBarcode("Barcode symbology is invalid", "symbology");
	}

	const barcodeValue = input.rawValue.normalize("NFC").trim();
	if (
		barcodeValue.length === 0 ||
		barcodeValue.length > MAX_ITEM_BARCODE_VALUE_LENGTH
	) {
		return invalidBarcode("Barcode value has an invalid length");
	}

	const numericLength = numericBarcodeLength(input.symbology);
	if (numericLength !== null) {
		const normalizedValue = barcodeValue.replace(
			NUMERIC_BARCODE_SEPARATOR_RE,
			"",
		);
		if (
			!NUMERIC_BARCODE_RE.test(normalizedValue) ||
			normalizedValue.length !== numericLength ||
			!hasValidGtinCheckDigit(normalizedValue)
		) {
			return invalidBarcode(
				`${input.symbology} requires ${numericLength} digits and a valid checksum`,
			);
		}
		return ok({ barcodeValue, normalizedValue });
	}

	if (input.symbology === "UPC_E") {
		const normalizedValue = barcodeValue.replace(
			NUMERIC_BARCODE_SEPARATOR_RE,
			"",
		);
		if (!hasValidUpcECheckDigit(normalizedValue)) {
			return invalidBarcode("UPC_E requires 8 digits and a valid checksum");
		}
		return ok({ barcodeValue, normalizedValue });
	}

	if (input.symbology === "CODE_128") {
		if (barcodeValue.length > 128 || !CODE_128_VALUE_RE.test(barcodeValue)) {
			return invalidBarcode(
				"CODE_128 values in master data must contain 1-128 printable ASCII characters",
			);
		}
		return ok({ barcodeValue, normalizedValue: barcodeValue });
	}

	if (CONTROL_CHARACTER_RE.test(barcodeValue)) {
		return invalidBarcode("Barcode value must not contain control characters");
	}
	if (UNSAFE_INVISIBLE_CHARACTER_RE.test(barcodeValue)) {
		return invalidBarcode(
			"Barcode value must not contain unsafe invisible characters",
		);
	}

	return ok({ barcodeValue, normalizedValue: barcodeValue });
}

function numericBarcodeLength(symbology: ItemBarcodeSymbology): number | null {
	switch (symbology) {
		case "EAN_8":
		case "EAN_13":
		case "UPC_A":
		case "GTIN_14":
			return NUMERIC_LENGTH_BY_SYMBOLOGY[symbology];
		case "UPC_E":
		case "CODE_128":
		case "QR":
		case "INTERNAL":
		case "OTHER":
			return null;
		default: {
			const exhaustive: never = symbology;
			return exhaustive;
		}
	}
}

export function normalizeBarcodePackQuantity(raw: string): Result<string> {
	if (typeof raw !== "string") {
		return invalidPackQuantity();
	}
	const value = raw.trim();
	const match = PACK_QUANTITY_RE.exec(value);
	if (match === null) return invalidPackQuantity();

	const integerPart = (match[1] ?? "").replace(/^0+(?=\d)/u, "");
	const fractionPart = (match[2] ?? "").replace(/0+$/u, "");
	if (
		integerPart.length > 12 ||
		fractionPart.length > MAX_ITEM_BARCODE_PACK_QUANTITY_SCALE ||
		!/[1-9]/u.test(`${integerPart}${fractionPart}`)
	) {
		return invalidPackQuantity();
	}

	return ok(
		fractionPart.length > 0 ? `${integerPart}.${fractionPart}` : integerPart,
	);
}

function hasValidGtinCheckDigit(value: string): boolean {
	const body = value.slice(0, -1);
	const expected = Number(value.at(-1));
	return (
		Number.isInteger(expected) && calculateGtinCheckDigit(body) === expected
	);
}

function hasValidUpcECheckDigit(value: string): boolean {
	if (!UPC_E_RE.test(value)) return false;

	const numberSystem = value[0] ?? "";
	const digits = value.slice(1, 7);
	const last = digits[5] ?? "";
	let upcABody: string;
	if (last === "0" || last === "1" || last === "2") {
		upcABody = `${numberSystem}${digits.slice(0, 2)}${last}0000${digits.slice(2, 5)}`;
	} else if (last === "3") {
		upcABody = `${numberSystem}${digits.slice(0, 3)}00000${digits.slice(3, 5)}`;
	} else if (last === "4") {
		upcABody = `${numberSystem}${digits.slice(0, 4)}00000${digits[4] ?? ""}`;
	} else {
		upcABody = `${numberSystem}${digits.slice(0, 5)}0000${last}`;
	}
	return calculateGtinCheckDigit(upcABody) === Number(value[7]);
}

function calculateGtinCheckDigit(body: string): number {
	let sum = 0;
	for (
		let index = body.length - 1, position = 0;
		index >= 0;
		index--, position++
	) {
		const digit = Number(body[index]);
		sum += digit * (position % 2 === 0 ? 3 : 1);
	}
	return (10 - (sum % 10)) % 10;
}

function invalidBarcode(
	message: string,
	field: "barcodeValue" | "symbology" = "barcodeValue",
): Result<never> {
	return fail("BAD_REQUEST", message, {
		reason: "MASTER_INVALID_BARCODE",
		field,
	} satisfies MasterFailureDetails);
}

function invalidPackQuantity(): Result<never> {
	return fail(
		"BAD_REQUEST",
		"packQuantity must be positive with at most 12 integer and 12 fractional digits",
		{
			reason: "MASTER_INVALID_BARCODE",
			field: "packQuantity",
		} satisfies MasterFailureDetails,
	);
}
