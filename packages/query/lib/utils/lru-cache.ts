/**
 * Caché LRU (Least Recently Used) simple
 * Mantiene un número máximo de entradas, eliminando las menos usadas
 */
export class LRUCache<K, V> {
	private cache = new Map<K, V>();
	private maxSize: number;

	constructor(maxSize = 1000) {
		this.maxSize = maxSize;
	}

	/**
	 * Obtiene un valor del caché
	 * Si existe, lo mueve al final (más reciente)
	 */
	get(key: K): V | undefined {
		const value = this.cache.get(key);
		if (value !== undefined) {
			// Mover al final (más reciente)
			this.cache.delete(key);
			this.cache.set(key, value);
		}
		return value;
	}

	/**
	 * Guarda un valor en el caché
	 * Si está lleno, elimina la entrada más antigua
	 */
	set(key: K, value: V): void {
		// Si existe, eliminar para reinsertar al final
		if (this.cache.has(key)) {
			this.cache.delete(key);
		}
		// Si está lleno, eliminar el más antiguo (primero)
		else if (this.cache.size >= this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}
		this.cache.set(key, value);
	}

	/**
	 * Limpia todo el caché
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Retorna el número de entradas en el caché
	 */
	get size(): number {
		return this.cache.size;
	}

	/**
	 * Retorna el tamaño máximo del caché
	 */
	get max(): number {
		return this.maxSize;
	}
}
