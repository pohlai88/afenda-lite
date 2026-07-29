import { ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";

import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import type { HumanResourcesQueryId } from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import type { HumanResourcesFieldProjection } from "../shared/authorization-types";
import type { HumanResourcesAuthorizedActorInput } from "../shared/run-authorized-operation";
import { runDomainAuthorizedOperation } from "../shared/run-authorized-operation";
import {
	runTalentEmployeeScopedQuery,
	runTalentQuery,
} from "../shared/talent-command";
import type { HumanResourcesStore } from "../store";

type TalentReadQueryConfig<
	TSchema extends z.ZodType<HumanResourcesAuthorizedActorInput>,
	TOut,
	TProjected = TOut,
> = {
	schema: TSchema;
	invalidMessage: string;
	query: HumanResourcesQueryId;
	resolveResource: (
		data: z.infer<TSchema>,
		options: HumanResourcesCommandOptions,
	) => Promise<
		| import("../shared/authorization-types").HumanResourcesResourceContext
		| undefined
	>;
	execute: (ctx: {
		data: z.infer<TSchema>;
		store: HumanResourcesStore;
	}) => Promise<Result<TOut>>;
	project?:
		| ((
				value: TOut,
				projection: HumanResourcesFieldProjection | undefined,
		  ) => TProjected)
		| undefined;
	resolveRequestedFields?:
		| ((data: z.infer<TSchema>) => readonly string[] | undefined)
		| undefined;
};

/**
 * Load resource facts → facade authorize → execute → optional field projection.
 */
export async function runAuthorizedTalentReadQuery<
	TSchema extends z.ZodType<HumanResourcesAuthorizedActorInput>,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: TalentReadQueryConfig<TSchema, TOut, TProjected>,
): Promise<Result<TProjected>> {
	return runTalentQuery(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		query: config.query,
		resolveResource: (data, opts) => config.resolveResource(data, opts),
		execute: (data, { store }) => config.execute({ data, store }),
		...(config.resolveRequestedFields === undefined
			? {}
			: { resolveRequestedFields: config.resolveRequestedFields }),
		...(config.project === undefined ? {} : { project: config.project }),
	});
}

type TalentLoadedReadConfig<
	TSchema extends z.ZodType<HumanResourcesAuthorizedActorInput>,
	TLoaded,
	TOut,
	TProjected = TOut,
> = {
	schema: TSchema;
	invalidMessage: string;
	query: HumanResourcesQueryId;
	load: (ctx: {
		data: z.infer<TSchema>;
		store: HumanResourcesStore;
	}) => Promise<Result<TLoaded | null>>;
	resolveResourceFromLoaded: (
		data: z.infer<TSchema>,
		loaded: TLoaded,
		options: HumanResourcesCommandOptions,
	) => Promise<
		| import("../shared/authorization-types").HumanResourcesResourceContext
		| undefined
	>;
	execute: (ctx: {
		data: z.infer<TSchema>;
		loaded: TLoaded;
		store: HumanResourcesStore;
	}) => Promise<Result<TOut>>;
	project?:
		| ((
				value: TOut,
				projection: HumanResourcesFieldProjection | undefined,
		  ) => TProjected)
		| undefined;
	resolveRequestedFields?:
		| ((data: z.infer<TSchema>) => readonly string[] | undefined)
		| undefined;
};

/** Load-by-id talent read with NOT_FOUND when missing, then facade authorize. */
export async function runAuthorizedTalentLoadedReadQuery<
	TSchema extends z.ZodType<HumanResourcesAuthorizedActorInput>,
	TLoaded,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: TalentLoadedReadConfig<TSchema, TLoaded, TOut, TProjected>,
): Promise<Result<TProjected | null>> {
	const parsed = parseHumanResourcesInput(
		config.schema,
		input,
		config.invalidMessage,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store } = resolveCommandDeps(options);
	const loaded = await config.load({ data: parsed.data, store });
	if (!loaded.ok) {
		return loaded;
	}
	if (loaded.data === null) {
		return ok(null);
	}

	const loadedRow = loaded.data;
	return runDomainAuthorizedOperation({
		operationId: config.query,
		operationKind: "query",
		data: parsed.data,
		options,
		resolveResource: async () =>
			config.resolveResourceFromLoaded(parsed.data, loadedRow, options),
		execute: () =>
			config.execute({
				data: parsed.data,
				loaded: loadedRow,
				store,
			}),
		...(config.resolveRequestedFields === undefined
			? {}
			: { resolveRequestedFields: config.resolveRequestedFields }),
		...(config.project === undefined ? {} : { project: config.project }),
	});
}

/** Employee-scoped list: authorize once against subject resource, project each row. */
export async function runAuthorizedTalentSubjectListQuery<
	TSchema extends z.ZodType<
		HumanResourcesAuthorizedActorInput & { employeeId: string }
	>,
	TItemsKey extends string,
	TItem,
	TProjectedItem,
	TPage extends {
		totalCount: number;
		page: number;
		pageSize: number;
	} & Record<TItemsKey, TItem[]>,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema: TSchema;
		invalidMessage: string;
		query: HumanResourcesQueryId;
		loadPage: (ctx: {
			data: z.infer<TSchema>;
			store: HumanResourcesStore;
		}) => Promise<Result<TPage>>;
		itemsKey: TItemsKey;
		projectItem: (
			item: TItem,
			projection: HumanResourcesFieldProjection | undefined,
		) => TProjectedItem;
		resolveRequestedFields?:
			| ((data: z.infer<TSchema>) => readonly string[] | undefined)
			| undefined;
	},
): Promise<
	Result<Omit<TPage, TItemsKey> & Record<TItemsKey, TProjectedItem[]>>
> {
	return runTalentEmployeeScopedQuery<
		TSchema,
		TPage,
		Omit<TPage, TItemsKey> & Record<TItemsKey, TProjectedItem[]>
	>(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		query: config.query,
		project: (page, projection) => {
			const items = page[config.itemsKey];
			return {
				...page,
				[config.itemsKey]: items.map((item) =>
					config.projectItem(item, projection),
				),
			} as Omit<TPage, TItemsKey> & Record<TItemsKey, TProjectedItem[]>;
		},
		execute: (data, { store }) => config.loadPage({ data, store }),
		...(config.resolveRequestedFields === undefined
			? {}
			: { resolveRequestedFields: config.resolveRequestedFields }),
	});
}
