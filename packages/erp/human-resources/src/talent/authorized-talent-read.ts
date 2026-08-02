import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import { parseHumanResourcesInput } from "../parse-input";
import type { HumanResourcesFieldProjection } from "../shared/authorization-types";
import type { HumanResourcesAuthorizedActorInput } from "../shared/run-authorized-operation";
import { runDomainAuthorizedOperation } from "../shared/run-authorized-operation";
import type { TalentResourceDeps } from "../shared/talent-resource";
import {
	runTalentCapabilityQuery,
	runTalentEmployeeScopedCapabilityQuery,
	type TalentQueryId,
} from "./run-operation";
import {
	type HumanResourcesTalentStoreMethod,
	type HumanResourcesTalentStoreProjection,
	projectTalentAuthorizationStore,
	projectTalentStore,
} from "./store";

interface TalentReadQueryConfig<
	TMethods extends readonly HumanResourcesTalentStoreMethod[],
	TSchema extends z.ZodType<HumanResourcesAuthorizedActorInput>,
	TOut,
	TProjected = TOut,
> {
	execute: (ctx: {
		data: z.infer<TSchema>;
		store: HumanResourcesTalentStoreProjection<TMethods>;
	}) => Promise<Result<TOut>>;
	invalidMessage: string;
	project?:
		| ((
				value: TOut,
				projection: HumanResourcesFieldProjection | undefined,
		  ) => TProjected)
		| undefined;
	query: TalentQueryId;
	resolveRequestedFields?:
		| ((data: z.infer<TSchema>) => readonly string[] | undefined)
		| undefined;
	resolveResource: (
		data: z.infer<TSchema>,
		deps: TalentResourceDeps,
	) => Promise<
		| import("../shared/authorization-types").HumanResourcesResourceContext
		| undefined
	>;
	schema: TSchema;
	storeMethods: TMethods;
}

/**
 * Load resource facts → facade authorize → execute → optional field projection.
 */
export function runAuthorizedTalentReadQuery<
	const TMethods extends readonly HumanResourcesTalentStoreMethod[],
	TSchema extends z.ZodType<HumanResourcesAuthorizedActorInput>,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: TalentReadQueryConfig<TMethods, TSchema, TOut, TProjected>,
): Promise<Result<TProjected>> {
	return runTalentCapabilityQuery(input, options, {
		storeMethods: config.storeMethods,
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

interface TalentLoadedReadConfig<
	TMethods extends readonly HumanResourcesTalentStoreMethod[],
	TSchema extends z.ZodType<HumanResourcesAuthorizedActorInput>,
	TLoaded,
	TOut,
	TProjected = TOut,
> {
	execute: (ctx: {
		data: z.infer<TSchema>;
		loaded: TLoaded;
		store: HumanResourcesTalentStoreProjection<TMethods>;
	}) => Promise<Result<TOut>>;
	invalidMessage: string;
	load: (ctx: {
		data: z.infer<TSchema>;
		store: HumanResourcesTalentStoreProjection<TMethods>;
	}) => Promise<Result<TLoaded | null>>;
	project?:
		| ((
				value: TOut,
				projection: HumanResourcesFieldProjection | undefined,
		  ) => TProjected)
		| undefined;
	query: TalentQueryId;
	resolveRequestedFields?:
		| ((data: z.infer<TSchema>) => readonly string[] | undefined)
		| undefined;
	resolveResourceFromLoaded: (
		data: z.infer<TSchema>,
		loaded: TLoaded,
		deps: TalentResourceDeps,
	) => Promise<
		| import("../shared/authorization-types").HumanResourcesResourceContext
		| undefined
	>;
	schema: TSchema;
	storeMethods: TMethods;
}

/** Load-by-id talent read with NOT_FOUND when missing, then facade authorize. */
export async function runAuthorizedTalentLoadedReadQuery<
	const TMethods extends readonly HumanResourcesTalentStoreMethod[],
	TSchema extends z.ZodType<HumanResourcesAuthorizedActorInput>,
	TLoaded,
	TOut,
	TProjected = TOut,
>(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: TalentLoadedReadConfig<TMethods, TSchema, TLoaded, TOut, TProjected>,
): Promise<Result<TProjected | null>> {
	const parsed = parseHumanResourcesInput(
		config.schema,
		input,
		config.invalidMessage,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, identityResolver } = resolveCommandDeps(options);
	const operationStore = projectTalentStore(store, config.storeMethods);
	const loaded = await config.load({
		data: parsed.data,
		store: operationStore,
	});
	if (!loaded.ok) {
		return loaded;
	}
	if (loaded.data === null) {
		return errorResult.ok(null);
	}

	const loadedRow = loaded.data;
	return runDomainAuthorizedOperation({
		operationId: config.query,
		operationKind: "query",
		data: parsed.data,
		options,
		resolveResource: async () =>
			config.resolveResourceFromLoaded(parsed.data, loadedRow, {
				identityResolver,
				store: projectTalentAuthorizationStore(store),
			}),
		execute: () =>
			config.execute({
				data: parsed.data,
				loaded: loadedRow,
				store: operationStore,
			}),
		...(config.resolveRequestedFields === undefined
			? {}
			: { resolveRequestedFields: config.resolveRequestedFields }),
		...(config.project === undefined ? {} : { project: config.project }),
	});
}

/** Employee-scoped list: authorize once against subject resource, project each row. */
export function runAuthorizedTalentSubjectListQuery<
	const TMethods extends readonly HumanResourcesTalentStoreMethod[],
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
		query: TalentQueryId;
		loadPage: (ctx: {
			data: z.infer<TSchema>;
			store: HumanResourcesTalentStoreProjection<TMethods>;
		}) => Promise<Result<TPage>>;
		itemsKey: TItemsKey;
		projectItem: (
			item: TItem,
			projection: HumanResourcesFieldProjection | undefined,
		) => TProjectedItem;
		resolveRequestedFields?:
			| ((data: z.infer<TSchema>) => readonly string[] | undefined)
			| undefined;
		storeMethods: TMethods;
	},
): Promise<
	Result<Omit<TPage, TItemsKey> & Record<TItemsKey, TProjectedItem[]>>
> {
	return runTalentEmployeeScopedCapabilityQuery<
		TMethods,
		TSchema,
		TPage,
		Omit<TPage, TItemsKey> & Record<TItemsKey, TProjectedItem[]>
	>(input, options, {
		storeMethods: config.storeMethods,
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
