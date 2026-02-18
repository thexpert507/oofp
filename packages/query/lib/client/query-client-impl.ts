import { CachedQuery, QueryCache, QueryKey, QueryResult } from "@/core";
import { QueryClient } from "./query-client";
import { QueryClientConfig } from "./query-client-config";
import { QueryOptions } from "./query-options";
import { MutationOptions } from "./mutation-options";
import * as TE from "@oofp/core/task-either";
import * as M from "@oofp/core/maybe";
import * as L from "@oofp/core/list";
import { pipe } from "@oofp/core/pipe";
import { LRUCache } from "@/utils/lru-cache";
import { serialize } from "@/utils/serialize";
import { DeduplicationController } from "@/utils/deduplication-controller";
import { InMemoryTelemetryCollector } from "@/core/telemetry-collector";
import { TelemetryCollector } from "@/core/cache-events";

/**
 * Configuración por defecto del QueryClient
 */
const DEFAULT_CONFIG = {
	defaultTTL: 5 * 60 * 1000, // 5 minutos
	maxCacheSize: 1000,
	lruCache: false,
};

/**
 * Implementación del QueryClient
 */
export class QueryClientImpl implements QueryClient {
	private config: Required<Omit<QueryClientConfig, "cache" | "telemetry">> &
		Pick<QueryClientConfig, "cache" | "telemetry">;
	private cache: QueryCache;
	public readonly telemetry: TelemetryCollector;
	private deduplicationController: DeduplicationController<Error>;

	constructor(config?: QueryClientConfig) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		const serializeCache = this.config.lruCache
			? new LRUCache<unknown, string>(this.config.maxCacheSize)
			: undefined;

		// Inicializar telemetry collector
		this.telemetry = config?.telemetry ?? new InMemoryTelemetryCollector();

		// Crear cache con telemetry
		this.cache = new QueryCache(config?.cache, serializeCache, this.telemetry);

		// Crear controlador de deduplicación con telemetría inyectada
		this.deduplicationController = new DeduplicationController<Error>(this.telemetry);
	}

	private toQueryResult<TData>() {
		return (cached: CachedQuery<TData>): QueryResult<TData> => {
			const age = Date.now() - cached.cachedAt;
			return { data: cached.data, cached: true, age };
		};
	}

	private getCachedQuery<TData>(queryKey: QueryKey): TE.TaskEither<Error, CachedQuery<TData>> {
		return pipe(
			this.cache.get<TData>(queryKey),
			TE.map(M.map((cached) => TE.right<Error, CachedQuery<TData>>(cached))),
			TE.chain(M.getOrElse(TE.left<Error, CachedQuery<TData>>(new Error("Cache miss")))),
		);
	}

	private getOptions<T>(options: QueryOptions<T>) {
		return {
			enabled: options.enabled ?? true,
			ttl: options.ttl ?? this.config.defaultTTL,
			retry: options.retry ?? 3,
			retryDelay: options.retryDelay ?? 1000,
			retryCount: typeof options.retry === "number" ? options.retry : 0,
			queryKey: options.queryKey,
			queryFn: options.queryFn,
		};
	}

	fetchQuery<TData>(options: QueryOptions<TData>): TE.TaskEither<Error, QueryResult<TData>> {
		const { enabled, queryKey } = this.getOptions(options);

		if (!enabled) return TE.left(new Error("Query is disabled"));

		return pipe(
			this.getCachedQuery<TData>(queryKey),
			TE.map(this.toQueryResult<TData>()),
			TE.chainLeft(() => this.executeFetch(options)),
		);
	}

	/**
	 * Ejecuta el fetch con deduplicación de requests usando el controller
	 */
	private executeFetch<TData>(
		options: QueryOptions<TData>,
	): TE.TaskEither<Error, QueryResult<TData>> {
		const { queryKey, queryFn, ttl, retryCount, retryDelay } = this.getOptions(options);
		const queryHash = serialize(queryKey);

		// Usar el controller para deduplicar la ejecución de la task
		return this.deduplicationController.deduplicate(queryHash, () =>
			pipe(
				queryFn(),
				TE.retry({ maxRetries: retryCount, delay: retryDelay }),
				TE.tchain((data) => this.cache.set(queryKey, data, ttl)),
				TE.map((data) => ({ data, cached: false, age: 0 }) as QueryResult<TData>),
			),
		);
	}

	/**
	 * Obtiene datos del cache sin hacer fetch
	 */
	getQueryData<TData>(queryKey: QueryKey): TE.TaskEither<Error, M.Maybe<TData>> {
		return pipe(this.cache.get<TData>(queryKey), TE.map(M.map((cached) => cached.data)));
	}

	/**
	 * Establece datos en el cache manualmente
	 */
	setQueryData<TData>(queryKey: QueryKey, data: TData, ttl?: number): TE.TaskEither<Error, void> {
		return this.cache.set(queryKey, data, ttl ?? this.config.defaultTTL);
	}

	/**
	 * Invalida queries que coinciden con el patrón
	 */
	invalidateQueries(queryKey: QueryKey): TE.TaskEither<Error, number> {
		return this.cache.invalidate(queryKey);
	}

	/**
	 * Elimina queries del cache (alias de invalidateQueries)
	 */
	removeQueries(queryKey: QueryKey): TE.TaskEither<Error, number> {
		return this.cache.invalidate(queryKey);
	}

	/**
	 * Limpia todo el cache
	 */
	clear(): TE.TaskEither<Error, void> {
		return this.cache.clear();
	}

	/**
	 * Crea una función de mutación que ejecuta mutationFn e invalida automáticamente
	 * las queries configuradas en caso de éxito
	 */
	mutate<TData, TVariables = void>(
		options: MutationOptions<TData, TVariables>,
	): (variables: TVariables) => TE.TaskEither<Error, TData> {
		return (variables: TVariables): TE.TaskEither<Error, TData> =>
			pipe(
				options.mutationFn(variables),
				TE.chain((data: TData): TE.TaskEither<Error, TData> => {
					// Si no hay función de invalidación, retornar directamente
					if (!options.invalidates) return TE.right<Error, TData>(data);

					// Obtener las query keys a invalidar ejecutando la función
					const queryKeysToInvalidate = options.invalidates(variables, data);

					// Si no hay keys para invalidar, retornar directamente
					if (queryKeysToInvalidate.length === 0) return TE.right<Error, TData>(data);

					// Invalidar todas las queries en paralelo y retornar los datos originales
					const invalidations = pipe(
						queryKeysToInvalidate,
						L.map((queryKey) => this.invalidateQueries(queryKey)),
					);

					return pipe(
						TE.concurrency()(invalidations),
						TE.map(() => data),
						TE.mapLeft((err): Error => (err instanceof Error ? err : new Error(String(err)))),
					);
				}),
			);
	}
}
