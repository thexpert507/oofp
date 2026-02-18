/**
 * Gestión del cache de queries
 */
import { pipe } from "@oofp/core/pipe";
import { CachedQuery } from "./cached-query";
import { hashQueryKey, QueryKey } from "./query-key";
import * as M from "@oofp/core/maybe";
import * as TE from "@oofp/core/task-either";
import { CacheStore, InMemoryCache } from "@/client/cache";
import { LRUCache } from "@/utils/lru-cache";
import { extractTags } from "@/utils/serialize";
import { TelemetryCollector } from "./cache-events";
import { InMemoryTelemetryCollector } from "./telemetry-collector";
import { withTiming } from "@/utils/timing";

/**
 * Cache interno para almacenar queries
 */
export class QueryCache {
	private store: CacheStore;
	private telemetry: TelemetryCollector;
	private serializeCache?: LRUCache<unknown, string>;

	constructor(
		store?: CacheStore,
		serializeCache?: LRUCache<unknown, string>,
		telemetry?: TelemetryCollector,
	) {
		this.store = store ?? new InMemoryCache();
		this.serializeCache = serializeCache;
		this.telemetry = telemetry ?? new InMemoryTelemetryCollector();
	}

	/**
	 * Obtiene una query del cache si existe
	 */
	get<TData>(queryKey: QueryKey): TE.TaskEither<Error, M.Maybe<CachedQuery<TData>>> {
		const key = hashQueryKey(queryKey, { cache: this.serializeCache });
		const tags = extractTags(queryKey);

		return pipe(
			withTiming(this.store.get<CachedQuery<TData>>(key)),
			TE.map(({ duration, value }) =>
				pipe(
					value,
					M.tap(() => this.telemetry.record({ type: "hit", key, tags, duration })),
					M.tapNothing(() => this.telemetry.record({ type: "miss", key, tags })),
				),
			),
		);
	}

	/**
	 * Almacena una query en el cache
	 */
	set<TData>(queryKey: QueryKey, data: TData, ttl: number): TE.TaskEither<Error, void> {
		const key = hashQueryKey(queryKey, { cache: this.serializeCache });
		const cachedAt = Date.now();
		const tags = extractTags(queryKey);
		const cached: CachedQuery<TData> = { data, cachedAt };

		const entry = { value: cached, tags, cachedAt, ttl };

		return pipe(
			this.store.set(key, entry),
			TE.tap(() => this.telemetry.record({ type: "set", key, tags, ttl })),
		);
	}

	/**
	 * Elimina una query específica del cache
	 */
	delete(queryKey: QueryKey): TE.TaskEither<Error, void> {
		const key = hashQueryKey(queryKey, { cache: this.serializeCache });
		const tags = extractTags(queryKey);

		return pipe(
			this.store.delete(key),
			TE.tap(() => this.telemetry.record({ type: "delete", key, tags })),
		);
	}

	/**
	 * Invalida queries que coinciden con un patrón usando tags
	 * Si no hay tags disponibles, usa búsqueda exacta por hash
	 */
	invalidate(pattern: QueryKey): TE.TaskEither<Error, number> {
		const tags = extractTags(pattern);

		if (tags.length > 0) {
			return pipe(
				this.store.invalidateByTags(tags),
				TE.tap((keysAffected) => this.telemetry.record({ type: "invalidate", tags, keysAffected })),
			);
		}

		// Fallback: búsqueda exacta por hash (para strings simples o patterns sin tags)
		return pipe(
			this.delete(pattern),
			TE.tap(() => this.telemetry.record({ type: "invalidate", tags: [], keysAffected: 1 })),
			TE.map(() => 1),
		);
	}

	/**
	 * Limpia todo el cache
	 */
	clear(): TE.TaskEither<Error, void> {
		return pipe(
			this.store.clear(),
			TE.tap(() => this.telemetry.record({ type: "clear" })),
		);
	}
}
