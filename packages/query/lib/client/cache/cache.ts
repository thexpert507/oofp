import * as TE from "@oofp/core/task-either";
import * as M from "@oofp/core/maybe";

/**
 * Entrada de cache con metadatos y tags para invalidación
 */
export interface CacheEntry<T = unknown> {
	value: T;
	tags: string[];
	cachedAt: number;
	ttl: number;
}

export interface CacheStore {
	get: <T = unknown>(key: string) => TE.TaskEither<Error, M.Maybe<T>>;
	set: <T = unknown>(key: string, entry: CacheEntry<T>) => TE.TaskEither<Error, void>;
	delete: (key: string) => TE.TaskEither<Error, void>;
	invalidateByTags: (tags: string[]) => TE.TaskEither<Error, number>;
	clear: () => TE.TaskEither<Error, void>;
}
