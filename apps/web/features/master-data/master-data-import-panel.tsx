// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	FormField,
	Input,
	NativeSelect,
	NativeSelectOption,
	Spinner,
	Textarea,
} from "@afenda/ui-system";
import { useState, useTransition } from "react";

import { applyMasterDataImportAction } from "@/app/actions/apply-master-data-import";
import { validateMasterDataImportAction } from "@/app/actions/validate-master-data-import";

const IMPORT_MODES = [
	"create_only",
	"update_existing",
	"create_or_update",
] as const;

type ImportMode = (typeof IMPORT_MODES)[number];

function isImportMode(value: string): value is ImportMode {
	return IMPORT_MODES.some((mode) => mode === value);
}

interface ImportPanelProps {
	canImportApply: boolean;
	canImportValidate: boolean;
}

interface RowPreview {
	code: string;
	message?: string | undefined;
	outcome: string;
}

/**
 * Party import validate (dry-run) + apply — JSON rows, max 100.
 */
export function MasterDataImportPanel({
	canImportValidate,
	canImportApply,
}: ImportPanelProps) {
	const [sourceSystem, setSourceSystem] = useState("manual");
	const [mode, setMode] = useState<ImportMode>("create_or_update");
	const [rowsJson, setRowsJson] = useState(
		'[\n  { "code": "ACME", "name": "Acme Trading", "partyKind": "organization" }\n]',
	);
	const [error, setError] = useState<string | null>(null);
	const [summary, setSummary] = useState<string | null>(null);
	const [rows, setRows] = useState<RowPreview[]>([]);
	const [pending, startTransition] = useTransition();

	function parseRows():
		| {
				ok: true;
				rows: Array<{
					code: string;
					name: string;
					partyKind: "organization" | "person";
					expectedVersion?: number;
				}>;
		  }
		| { ok: false; message: string } {
		try {
			const parsed: unknown = JSON.parse(rowsJson);
			if (!Array.isArray(parsed) || parsed.length === 0) {
				return { ok: false, message: "Rows must be a non-empty JSON array." };
			}
			return {
				ok: true,
				rows: parsed as Array<{
					code: string;
					name: string;
					partyKind: "organization" | "person";
					expectedVersion?: number;
				}>,
			};
		} catch {
			return { ok: false, message: "Rows JSON is invalid." };
		}
	}

	function onValidate() {
		setError(null);
		setSummary(null);
		const parsed = parseRows();
		if (!parsed.ok) {
			setError(parsed.message);
			return;
		}
		startTransition(async () => {
			const result = await validateMasterDataImportAction({
				sourceSystem,
				entity: "party",
				mode,
				rows: parsed.rows,
			});
			if (!result.ok) {
				setRows([]);
				setError(result.message);
				return;
			}
			setSummary(
				`Dry-run · mode ${result.data.mode} · create ${result.data.created} · update ${result.data.updated} · unchanged ${result.data.unchanged} · rejected ${result.data.rejected} · conflict ${result.data.conflicted}`,
			);
			setRows(
				result.data.rows.map((row) => ({
					code: row.code,
					outcome: row.outcome,
					message: row.message,
				})),
			);
		});
	}

	function onApply() {
		setError(null);
		setSummary(null);
		const parsed = parseRows();
		if (!parsed.ok) {
			setError(parsed.message);
			return;
		}
		startTransition(async () => {
			const result = await applyMasterDataImportAction({
				sourceSystem,
				entity: "party",
				mode,
				idempotencyKey: crypto.randomUUID(),
				rows: parsed.rows,
			});
			if (!result.ok) {
				setRows([]);
				setError(result.message);
				return;
			}
			setSummary(
				`Applied · mode ${result.data.mode} · create ${result.data.created} · update ${result.data.updated} · unchanged ${result.data.unchanged} · rejected ${result.data.rejected} · conflict ${result.data.conflicted}`,
			);
			setRows(
				result.data.rows.map((row) => ({
					code: row.code,
					outcome: row.outcome,
					message: row.message,
				})),
			);
		});
	}

	if (!(canImportValidate || canImportApply)) {
		return (
			<Alert role="status">
				<AlertTitle>Import unavailable</AlertTitle>
				<AlertDescription>
					You need master_data.import_validate or master_data.import_apply to
					use import.
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="flex flex-col gap-(--field-gap)">
			{summary ? (
				<Alert role="status">
					<AlertTitle>Import report</AlertTitle>
					<AlertDescription>{summary}</AlertDescription>
				</Alert>
			) : null}
			{error ? <FormError>{error}</FormError> : null}
			<FormField fieldId="md-import-source" label="Source system" required>
				<Input
					autoComplete="off"
					disabled={pending}
					id="md-import-source"
					onChange={(event) => setSourceSystem(event.target.value)}
					value={sourceSystem}
				/>
			</FormField>
			<FormField fieldId="md-import-mode" label="Mode" required>
				<NativeSelect
					disabled={pending}
					id="md-import-mode"
					onChange={(event) => {
						if (isImportMode(event.currentTarget.value)) {
							setMode(event.currentTarget.value);
						}
					}}
					value={mode}
				>
					<NativeSelectOption value="create_or_update">
						create_or_update
					</NativeSelectOption>
					<NativeSelectOption value="create_only">
						create_only
					</NativeSelectOption>
					<NativeSelectOption value="update_existing">
						update_existing
					</NativeSelectOption>
				</NativeSelect>
			</FormField>
			<FormField fieldId="md-import-rows" label="Party rows (JSON)" required>
				<Textarea
					className="font-mono text-xs"
					disabled={pending}
					id="md-import-rows"
					onChange={(event) => setRowsJson(event.target.value)}
					rows={8}
					value={rowsJson}
				/>
			</FormField>
			<div className="flex flex-wrap gap-2">
				{canImportValidate ? (
					<Button disabled={pending} onClick={onValidate} type="button">
						{pending ? <Spinner /> : null}
						Validate (dry-run)
					</Button>
				) : null}
				{canImportApply ? (
					<Button disabled={pending} onClick={onApply} type="button">
						{pending ? <Spinner /> : null}
						Apply import
					</Button>
				) : null}
			</div>
			{rows.length > 0 ? (
				<ul className="space-y-1 text-sm">
					{rows.map((row) => (
						<li key={`${row.code}-${row.outcome}`}>
							<span className="font-medium">{row.code}</span>
							<span className="text-muted-foreground">
								{" "}
								· {row.outcome}
								{row.message ? ` · ${row.message}` : ""}
							</span>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
