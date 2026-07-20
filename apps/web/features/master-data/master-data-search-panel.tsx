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
} from "@afenda/ui-system";
import { useState, useTransition } from "react";

import {
	type SearchMasterDataHit,
	searchMasterDataAction,
} from "@/app/actions/search-master-data";

/**
 * Read-only master-data search — calls `searchMasterDataAction`.
 */
export function MasterDataSearchPanel() {
	const [query, setQuery] = useState("");
	const [hits, setHits] = useState<SearchMasterDataHit[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function onSearch(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		startTransition(async () => {
			const result = await searchMasterDataAction({ query, limit: 25 });
			if (!result.ok) {
				setHits([]);
				setError(result.message);
				return;
			}
			setHits(result.data.hits);
		});
	}

	return (
		<div className="flex flex-col gap-(--field-gap)">
			<form
				onSubmit={onSearch}
				aria-busy={pending}
				className="flex max-w-lg flex-col gap-(--field-gap)"
			>
				<FormField label="Search" required fieldId="md-search-query">
					<Input
						id="md-search-query"
						name="query"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						required
						autoComplete="off"
						disabled={pending}
						placeholder="Party, item, warehouse…"
					/>
				</FormField>
				{error ? <FormError>{error}</FormError> : null}
				<Button type="submit" disabled={pending || query.trim().length === 0}>
					{pending ? <Spinner /> : null}
					Search
				</Button>
			</form>
			{hits.length > 0 ? (
				<ul className="space-y-2 text-sm">
					{hits.map((hit) => (
						<li key={`${hit.entity}:${hit.documentId}`}>
							<span className="font-medium">{hit.title}</span>
							<span className="text-muted-foreground">
								{" "}
								· {hit.entity}
								{hit.description ? ` · ${hit.description}` : ""}
							</span>
						</li>
					))}
				</ul>
			) : null}
			{!pending && hits.length === 0 && query.trim().length > 0 && !error ? (
				<Alert role="status">
					<AlertTitle>No matches</AlertTitle>
					<AlertDescription>
						Try another query or rebuild the search index.
					</AlertDescription>
				</Alert>
			) : null}
		</div>
	);
}
