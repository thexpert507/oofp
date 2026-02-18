/**
 * Query almacenada en cache con sus datos y timestamp de creación
 */
export interface CachedQuery<TData = unknown> {
	data: TData;
	cachedAt: number; // Timestamp en ms cuando se guardó
}
