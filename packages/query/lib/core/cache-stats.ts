/**
 * Estadísticas del cache
 */
export interface CacheStats {
	hits: number; // Cache hits
	misses: number; // Cache misses
	hitRate: number; // Porcentaje de hits
}
