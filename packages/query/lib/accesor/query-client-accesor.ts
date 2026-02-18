import { MutationOptions, QueryClient, QueryOptions } from "@/client";
import * as RTE from "@oofp/core/reader-task-either";
import { pipe } from "@oofp/core/pipe";

type Context = { query_client: QueryClient };

type QueryOptionsWc<CTX, TData> = Omit<QueryOptions<TData>, "queryFn"> & {
	queryFn: () => RTE.ReaderTaskEither<CTX, Error, TData>;
};

type MutationOptionsWc<CTX, TData, TVariables> = Omit<
	MutationOptions<TData, TVariables>,
	"mutationFn"
> & {
	mutationFn: (variables: TVariables) => RTE.ReaderTaskEither<CTX, Error, TData>;
};

export const QueryClientAccesor = {
	query: <TData>(options: QueryOptions<TData>) =>
		pipe(
			RTE.ask<Context>(),
			RTE.chaint((ctx) => ctx.query_client.fetchQuery<TData>(options)),
		),
	querywc: <CTX, TData>(options: QueryOptionsWc<CTX, TData>) =>
		pipe(
			RTE.ask<Context & CTX>(),
			RTE.chaint((ctx) =>
				ctx.query_client.fetchQuery<TData>({
					...options,
					queryFn: () => options.queryFn()(ctx),
				}),
			),
		),
	mutate:
		<TData, TVariables = void>(options: MutationOptions<TData, TVariables>) =>
		(variables: TVariables) =>
			pipe(
				RTE.ask<Context>(),
				RTE.chaint((ctx) => ctx.query_client.mutate<TData, TVariables>(options)(variables)),
			),

	mutatewc:
		<CTX, TData, TVariables = void>(options: MutationOptionsWc<CTX, TData, TVariables>) =>
		(variables: TVariables) =>
			pipe(
				RTE.ask<Context & CTX>(),
				RTE.chaint((ctx) =>
					ctx.query_client.mutate<TData, TVariables>({
						mutationFn: (vars) => options.mutationFn(vars)(ctx),
						invalidates: options.invalidates,
					})(variables),
				),
			),
};
