import { CacheStats } from "./cache-stats";

/**
 * Eventos del sistema de cache para telemetría
 */
export type CacheEvent =
	| { type: "hit"; key: string; tags: string[]; duration: number }
	| { type: "miss"; key: string; tags: string[] }
	| { type: "set"; key: string; tags: string[]; ttl: number }
	| { type: "invalidate"; tags: string[]; keysAffected: number }
	| { type: "deduplicate"; key: string; waiters: number }
	| { type: "delete"; key: string; tags: string[] }
	| { type: "clear" };

/**
 * Interface para colectores de telemetría
 */
export interface TelemetryCollector {
	/**
	 * Registra un evento de cache
	 */
	record(event: CacheEvent): void;

	/**
	 * Obtiene las estadísticas básicas del cache
	 */
	getStats(): CacheStats;
}
