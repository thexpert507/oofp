import { CacheEntry, CacheStore } from "./cache";
import * as TE from "@oofp/core/task-either";
import * as M from "@oofp/core/maybe";
import { createClient, RedisClientType } from "redis";

export interface RedisCacheConfig {
	/**
	 * URL de conexión a Redis (ej: redis://localhost:6379)
	 */
	url?: string;
	/**
	 * Host de Redis (por defecto: localhost)
	 */
	host?: string;
	/**
	 * Puerto de Redis (por defecto: 6379)
	 */
	port?: number;
	/**
	 * Password para autenticación
	 */
	password?: string;
	/**
	 * Base de datos de Redis (por defecto: 0)
	 */
	database?: number;
	/**
	 * Prefijo para todas las keys de cache
	 */
	keyPrefix?: string;
}

/**
 * Implementación de CacheStore usando Redis como backend.
 * Utiliza Sets de Redis para mantener el índice invertido de tags.
 */
export class RedisCache implements CacheStore {
	private client: RedisClientType;
	private keyPrefix: string;
	private connected = false;

	constructor(config: RedisCacheConfig = {}) {
		this.keyPrefix = config.keyPrefix || "oofp-query:";

		// Crear cliente de Redis
		if (config.url) {
			this.client = createClient({ url: config.url });
		} else {
			this.client = createClient({
				socket: {
					host: config.host || "localhost",
					port: config.port || 6379,
				},
				password: config.password,
				database: config.database || 0,
			});
		}

		// Manejar errores de conexión
		this.client.on("error", (err) => {
			console.error("Redis Client Error:", err);
		});
	}

	/**
	 * Conectar al servidor de Redis
	 */
	async connect(): Promise<void> {
		if (!this.connected) {
			await this.client.connect();
			this.connected = true;
		}
	}

	/**
	 * Desconectar del servidor de Redis
	 */
	async disconnect(): Promise<void> {
		if (this.connected) {
			await this.client.quit();
			this.connected = false;
		}
	}

	/**
	 * Genera la key completa con prefijo
	 */
	private getFullKey(key: string): string {
		return `${this.keyPrefix}${key}`;
	}

	/**
	 * Genera la key para el índice de tags
	 */
	private getTagKey(tag: string): string {
		return `${this.keyPrefix}tag:${tag}`;
	}

	get<T = unknown>(key: string): TE.TaskEither<Error, M.Maybe<T>> {
		return TE.fromTask(async () => {
			try {
				await this.connect();
				const fullKey = this.getFullKey(key);
				const data = await this.client.get(fullKey);

				if (!data) return M.nothing();

				const entry: CacheEntry<T> = JSON.parse(data);

				// Redis ya maneja el TTL, pero verificamos por seguridad
				const now = Date.now();
				if (now > entry.cachedAt + entry.ttl) {
					await this.delete(key)();
					return M.nothing();
				}

				return M.just(entry.value);
			} catch (error) {
				throw error instanceof Error ? error : new Error(String(error));
			}
		});
	}

	set<T>(key: string, entry: CacheEntry<T>): TE.TaskEither<Error, void> {
		return TE.fromTask(async () => {
			try {
				await this.connect();
				const fullKey = this.getFullKey(key);

				// Calcular TTL en segundos para Redis
				const ttlSeconds = Math.ceil(entry.ttl / 1000);

				// Si la key ya existe, limpiar sus tags
				const existingData = await this.client.get(fullKey);
				if (existingData) {
					const existingEntry: CacheEntry<T> = JSON.parse(existingData);
					await this.removeFromTagIndex(key, existingEntry.tags);
				}

				// Guardar la entrada en Redis con TTL
				const serialized = JSON.stringify(entry);
				await this.client.setEx(fullKey, ttlSeconds, serialized);

				// Actualizar índice de tags
				await this.addToTagIndex(key, entry.tags, ttlSeconds);
			} catch (error) {
				throw error instanceof Error ? error : new Error(String(error));
			}
		});
	}

	delete(key: string): TE.TaskEither<Error, void> {
		return TE.fromTask(async () => {
			try {
				await this.connect();
				const fullKey = this.getFullKey(key);

				// Obtener tags antes de eliminar
				const data = await this.client.get(fullKey);
				if (data) {
					const entry: CacheEntry = JSON.parse(data);
					await this.removeFromTagIndex(key, entry.tags);
				}

				// Eliminar la key
				await this.client.del(fullKey);
			} catch (error) {
				throw error instanceof Error ? error : new Error(String(error));
			}
		});
	}

	invalidateByTags(tags: string[]): TE.TaskEither<Error, number> {
		return TE.fromTask(async () => {
			try {
				if (tags.length === 0) return 0;

				await this.connect();

				// Obtener todas las keys que tienen el primer tag
				const firstTagKey = this.getTagKey(tags[0]);
				const candidateKeys = await this.client.sMembers(firstTagKey);

				if (candidateKeys.length === 0) return 0;

				// Filtrar keys que tienen todos los tags
				const keysToDelete: string[] = [];

				for (const key of candidateKeys) {
					const fullKey = this.getFullKey(key);
					const data = await this.client.get(fullKey);

					if (data) {
						const entry: CacheEntry = JSON.parse(data);
						// Verificar que la entrada tenga todos los tags solicitados
						if (tags.every((tag) => entry.tags.includes(tag))) {
							keysToDelete.push(key);
						}
					}
				}

				// Eliminar todas las keys encontradas
				for (const key of keysToDelete) {
					await this.delete(key)();
				}

				return keysToDelete.length;
			} catch (error) {
				throw error instanceof Error ? error : new Error(String(error));
			}
		});
	}

	clear(): TE.TaskEither<Error, void> {
		return TE.fromTask(async () => {
			try {
				await this.connect();

				// Obtener todas las keys con nuestro prefijo
				const pattern = `${this.keyPrefix}*`;
				const keys = await this.client.keys(pattern);

				if (keys.length > 0) {
					await this.client.del(keys);
				}
			} catch (error) {
				throw error instanceof Error ? error : new Error(String(error));
			}
		});
	}

	/**
	 * Agrega una key al índice invertido de tags usando Redis Sets
	 */
	private async addToTagIndex(key: string, tags: string[], ttlSeconds: number): Promise<void> {
		for (const tag of tags) {
			const tagKey = this.getTagKey(tag);
			await this.client.sAdd(tagKey, key);
			// Establecer TTL en el Set de tags
			await this.client.expire(tagKey, ttlSeconds);
		}
	}

	/**
	 * Elimina una key del índice invertido de tags
	 */
	private async removeFromTagIndex(key: string, tags: string[]): Promise<void> {
		for (const tag of tags) {
			const tagKey = this.getTagKey(tag);
			await this.client.sRem(tagKey, key);

			// Si el Set quedó vacío, eliminarlo
			const count = await this.client.sCard(tagKey);
			if (count === 0) {
				await this.client.del(tagKey);
			}
		}
	}
}
