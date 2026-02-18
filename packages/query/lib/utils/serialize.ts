import { LRUCache } from "./lru-cache";

export type Serializable =
	| string
	| number
	| boolean
	| null
	| Date
	| Serializable[]
	| { [key: string]: Serializable };

/**
 * Opciones para la función serialize
 */
export interface SerializeOptions {
	/**
	 * Caché LRU opcional para almacenar resultados de serialización
	 * Útil cuando se serializan los mismos objetos repetidamente
	 */
	cache?: LRUCache<unknown, string>;
}

/**
 * Serializa un valor JavaScript a string de forma determinística
 * Los objetos se serializan con claves ordenadas alfabéticamente
 */
const serializeInternal = (data: Serializable, options?: SerializeOptions): string => {
	if (data === null) return "null";

	if (data instanceof Date) return `"${data.toISOString()}"`;

	if (typeof data === "string") return JSON.stringify(data);

	if (typeof data === "number" || typeof data === "boolean") return String(data);

	if (Array.isArray(data)) {
		const serializedItems = data.map((item) => serializeInternal(item, options));
		return `[${serializedItems.join(",")}]`;
	}

	if (typeof data === "object") {
		const keys = Object.keys(data).sort();
		const serializedPairs = keys.map((key) => {
			const value = data[key];
			return `${JSON.stringify(key)}:${serializeInternal(value, options)}`;
		});
		return `{${serializedPairs.join(",")}}`;
	}

	return String(data);
};

/**
 * Serializa un valor JavaScript a string de forma determinística
 *
 * @param data - El valor a serializar
 * @param options - Opciones de serialización (incluye caché opcional)
 * @returns String serializado
 *
 * @example
 * ```ts
 * // Sin caché
 * serialize({ id: 1, name: "John" });
 * // => '{"id":1,"name":"John"}'
 *
 * // Con caché
 * const cache = new LRUCache<unknown, string>(100);
 * serialize({ id: 1, name: "John" }, { cache });
 * ```
 */
export const serialize = (data: Serializable, options?: SerializeOptions): string => {
	// Para primitivos, no usar caché (son muy rápidos)
	if (
		data === null ||
		typeof data === "string" ||
		typeof data === "number" ||
		typeof data === "boolean"
	) {
		return serializeInternal(data, options);
	}

	if (!options?.cache) return serializeInternal(data, options);

	const cached = options.cache.get(data);
	if (cached !== undefined) return cached;

	const result = serializeInternal(data, options);
	options.cache.set(data, result);
	return result;
};

// Extrae tags para invalidación de cache
export const extractTags = (data: Serializable, prefix = ""): string[] => {
	const tags: string[] = [];

	if (data === null || data instanceof Date) return tags;

	if (typeof data === "string" || typeof data === "number" || typeof data === "boolean")
		return tags;

	if (Array.isArray(data)) {
		for (let i = 0; i < data.length; i++) {
			const item = data[i];
			const itemPrefix = prefix ? `${prefix}[${i}]` : `[${i}]`;

			if (
				item === null ||
				typeof item === "string" ||
				typeof item === "number" ||
				typeof item === "boolean"
			) {
				tags.push(`${itemPrefix}:${item}`);
			} else if (item instanceof Date) {
				tags.push(`${itemPrefix}:${item.toISOString()}`);
			}

			tags.push(...extractTags(item, itemPrefix));
		}
		return tags;
	}

	if (typeof data === "object") {
		for (const [key, value] of Object.entries(data)) {
			const fullKey = prefix ? `${prefix}.${key}` : key;

			// Agregar tag del par key:value para primitivos
			if (
				value === null ||
				typeof value === "string" ||
				typeof value === "number" ||
				typeof value === "boolean"
			) {
				tags.push(`${fullKey}:${value}`);
			} else if (value instanceof Date) {
				tags.push(`${fullKey}:${value.toISOString()}`);
			}

			// Recursivamente extraer tags anidados
			tags.push(...extractTags(value, fullKey));
		}
	}

	return tags;
};
