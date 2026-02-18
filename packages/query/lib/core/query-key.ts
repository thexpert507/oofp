import { serialize, Serializable } from "@/utils/serialize";

/**
 * Query key puede ser un string simple o un array jerárquico
 * Ejemplos: 'users' | ['users', 123] | ['posts', 'draft', userId]
 */
export type QueryKey = Serializable;

/**
 * Convierte una QueryKey en un string único para usar como identificador
 */
export const hashQueryKey = serialize;

/**
 * Verifica si dos QueryKeys son iguales
 */
export const areKeysEqual = (keyA: QueryKey, keyB: QueryKey): boolean =>
	hashQueryKey(keyA) === hashQueryKey(keyB);

/**
 * Verifica si una key coincide con un patrón (para invalidación)
 * Ejemplo: matchesPattern(['users', 1], ['users']) => true
 */
export const matchesPattern = (key: QueryKey, pattern: QueryKey): boolean => {
	const keyStr = hashQueryKey(key);
	const patternStr = hashQueryKey(pattern);

	// Si el patrón es string, match exacto
	if (typeof pattern === "string") return keyStr === patternStr;

	// Si el patrón es array, verificar si key empieza con el patrón
	if (Array.isArray(pattern) && Array.isArray(key)) {
		if (pattern.length > key.length) return false;
		return pattern.every((item, index) => {
			return JSON.stringify(item) === JSON.stringify(key[index]);
		});
	}

	return keyStr.startsWith(patternStr.slice(0, -1));
};
