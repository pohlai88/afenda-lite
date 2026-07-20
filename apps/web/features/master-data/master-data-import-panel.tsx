"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	FormField,
	Input,
	Spinner,
	Textarea,
} from "@afenda/ui-system";
import { useState, useTransition } from "react";

import { applyMasterDataImportAction } from "@/app/actions/apply-master-data-import";
import { validateMasterDataImportAction } from "@/app/actions/validate-master-data-import";

type ImportPanelProps = {
	canManage: boolean;
	canImportApprove: boolean;
};

type RowPreview = {
	code: string;
	outcome: string;
	message?: string;
};

/**
 * Party import validate (dry-run) + apply — JSON rows, max 100.
 */
export function MasterDataImportPanel({
	canManage,
	canImportApprove,
}: ImportPanelProps) {
	const [sourceSystem, setSourceSystem] = useState("manual");
	const [mode, setMode] = useState<
		"create_only" | "update_existing" | "create_or_update"
	>("create_or_update");
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

	if (!canManage && !canImportApprove) {
		return (
			<Alert role="status">
				<AlertTitle>Import unavailable</AlertTitle>
				<AlertDescription>
					You need master_data.manage (validate) or master_data.import_approve
					(apply) to use import.
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
			<FormField label="Source system" required fieldId="md-import-source">
				<Input
					id="md-import-source"
					value={sourceSystem}
					onChange={(event) => setSourceSystem(event.target.value)}
					disabled={pending}
					autoComplete="off"
				/>
			</FormField>
			<FormField label="Mode" required fieldId="md-import-mode">
				<select
					id="md-import-mode"
					className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
					value={mode}
					onChange={(event) =>
						setMode(
							event.target.value as
								| "create_only"
								| "update_existing"
								| "create_or_update",
						)
					}
					disabled={pending}
				>
					<option value="create_or_update">create_or_update</option>
					<option value="create_only">create_only</option>
					<option value="update_existing">update_existing</option>
				</select>
			</FormField>
			<FormField label="Party rows (JSON)" required fieldId="md-import-rows">
				<Textarea
					id="md-import-rows"
					value={rowsJson}
					onChange={(event) => setRowsJson(event.target.value)}
					disabled={pending}
					rows={8}
					className="font-mono text-xs"
				/>
			</FormField>
			<div className="flex flex-wrap gap-2">
				{canManage ? (
					<Button type="button" onClick={onValidate} disabled={pending}>
						{pending ? <Spinner /> : null}
						Validate (dry-run)
					</Button>
				) : null}
				{canImportApprove ? (
					<Button type="button" onClick={onApply} disabled={pending}>
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
