import { CacheEntry, CacheStore } from "./cache";
import * as M from "@oofp/core/maybe";
import * as TE from "@oofp/core/task-either";

export class InMemoryCache implements CacheStore {
	private store = new Map<string, CacheEntry & { expiresAt: number }>();
	private tagIndex = new Map<string, Set<string>>();

	get<T = unknown>(key: string): TE.TaskEither<Error, M.Maybe<T>> {
		return TE.fromTask(async () => {
			const entry = this.store.get(key);
			if (!entry) return M.nothing();

			// Lazy expiration: verificar si expiró
			if (Date.now() > entry.expiresAt) {
				await this.delete(key)();
				return M.nothing();
			}

			return M.just(entry.value as T);
		});
	}

	set<T>(key: string, entry: CacheEntry<T>): TE.TaskEither<Error, void> {
		return TE.fromTask(async () => {
			// Si la key ya existe, limpiar sus tags del índice
			const existingEntry = this.store.get(key);
			if (existingEntry) this.removeFromTagIndex(key, existingEntry.tags);

			// Guardar la entrada con expiresAt
			const expiresAt = entry.cachedAt + entry.ttl;
			this.store.set(key, { ...entry, expiresAt });

			// Actualizar índice invertido de tags
			this.addToTagIndex(key, entry.tags);
		});
	}

	delete(key: string): TE.TaskEither<Error, void> {
		return TE.fromTask(async () => {
			const entry = this.store.get(key);
			if (entry) this.removeFromTagIndex(key, entry.tags);
			this.store.delete(key);
		});
	}

	invalidateByTags(tags: string[]): TE.TaskEither<Error, number> {
		return TE.fromTask(async () => {
			if (tags.length === 0) return 0;

			const keysToDelete = new Set<string>();

			// Encontrar todas las keys que tienen TODAS las tags
			// Empezar con las keys del primer tag
			const firstTagKeys = this.tagIndex.get(tags[0]);
			if (!firstTagKeys || firstTagKeys.size === 0) return 0;

			// Para cada key candidata, verificar que tenga todas las tags
			for (const key of firstTagKeys) {
				const entry = this.store.get(key);
				if (entry && tags.every((tag) => entry.tags.includes(tag))) {
					keysToDelete.add(key);
				}
			}

			// Eliminar las keys encontradas
			for (const key of keysToDelete) {
				await this.delete(key)();
			}

			return keysToDelete.size;
		});
	}

	clear(): TE.TaskEither<Error, void> {
		return TE.fromTask(async () => {
			this.store.clear();
			this.tagIndex.clear();
		});
	}

	/**
	 * Agrega una key al índice invertido de tags
	 */
	private addToTagIndex(key: string, tags: string[]): void {
		for (const tag of tags) {
			if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
			this.tagIndex.get(tag)!.add(key);
		}
	}

	/**
	 * Elimina una key del índice invertido de tags
	 */
	private removeFromTagIndex(key: string, tags: string[]): void {
		for (const tag of tags) {
			const keysSet = this.tagIndex.get(tag);
			if (keysSet) {
				keysSet.delete(key);
				// Si el Set quedó vacío, eliminar la entrada del índice
				if (keysSet.size === 0) {
					this.tagIndex.delete(tag);
				}
			}
		}
	}
}
