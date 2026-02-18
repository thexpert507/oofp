/**
 * QueryClient - Cliente principal para gestión de queries
 */
import { QueryKey } from "@/core/query-key";
import { QueryResult } from "@/core";
import { QueryOptions } from "./query-options";
import { MutationOptions } from "./mutation-options";
import { QueryClientConfig } from "./query-client-config";
import { QueryClientImpl } from "./query-client-impl";
import * as TE from "@oofp/core/task-either";
import * as M from "@oofp/core/maybe";

/**
 * Interfaz del QueryClient
 */
export interface QueryClient {
	fetchQuery<TData>(options: QueryOptions<TData>): TE.TaskEither<Error, QueryResult<TData>>;
	getQueryData<TData>(queryKey: QueryKey): TE.TaskEither<Error, M.Maybe<TData>>;
	setQueryData<TData>(queryKey: QueryKey, data: TData, ttl?: number): TE.TaskEither<Error, void>;
	invalidateQueries(queryKey: QueryKey): TE.TaskEither<Error, number>;
	removeQueries(queryKey: QueryKey): TE.TaskEither<Error, number>;
	clear(): TE.TaskEither<Error, void>;
	mutate<TData, TVariables = void>(
		options: MutationOptions<TData, TVariables>,
	): (variables: TVariables) => TE.TaskEither<Error, TData>;
}

/**
 * Factory function para crear un QueryClient
 */
export const createQueryClient = (config?: QueryClientConfig): QueryClient =>
	new QueryClientImpl(config);
