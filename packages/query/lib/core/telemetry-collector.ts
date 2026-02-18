import { CacheEvent, TelemetryCollector } from "./cache-events";
import { CacheStats } from "./cache-stats";

/**
 * Entrada de frecuencia de acceso a una key
 */
export interface KeyFrequency {
	key: string;
	hits: number;
	lastAccess: number;
}

/**
 * Estadísticas extendidas del cache
 */
export interface ExtendedCacheStats extends CacheStats {
	sets: number;
	deletes: number;
	invalidations: number;
	deduplications: number;
	clears: number;
	totalKeysInvalidated: number;
	avgInvalidationSize: number;
	deduplicationRate: number;
	avgHitDuration: number;
	estimatedCacheSize: number;
}

/**
 * Listener de estadísticas
 * Se invoca cada vez que las estadísticas cambian
 */
export type StatsListener = (stats: ExtendedCacheStats, event: CacheEvent) => void;

/**
 * Función para cancelar la suscripción
 */
export type UnsubscribeFn = () => void;

/**
 * Implementación en memoria del colector de telemetría
 * Almacena eventos y calcula estadísticas agregadas
 */
export class InMemoryTelemetryCollector implements TelemetryCollector {
	private events: CacheEvent[] = [];
	private stats = {
		hits: 0,
		misses: 0,
		sets: 0,
		deletes: 0,
		invalidations: 0,
		deduplications: 0,
		clears: 0,
		totalKeysInvalidated: 0,
		totalHitDuration: 0,
	};
	private keyFrequency = new Map<string, KeyFrequency>();
	private activeKeys = new Set<string>();
	private listeners = new Set<StatsListener>();

	/**
	 * Registra un evento de cache
	 */
	record(event: CacheEvent): void {
		this.events.push(event);

		switch (event.type) {
			case "hit":
				this.stats.hits++;
				this.stats.totalHitDuration += event.duration;
				// Trackear frecuencia de acceso
				this.trackKeyAccess(event.key);
				break;
			case "miss":
				this.stats.misses++;
				break;
			case "set":
				this.stats.sets++;
				this.activeKeys.add(event.key);
				break;
			case "delete":
				this.stats.deletes++;
				this.activeKeys.delete(event.key);
				break;
			case "invalidate":
				this.stats.invalidations++;
				this.stats.totalKeysInvalidated += event.keysAffected;
				break;
			case "deduplicate":
				this.stats.deduplications++;
				break;
			case "clear":
				this.stats.clears++;
				this.activeKeys.clear();
				break;
		}

		// Notificar a los listeners después de procesar el evento
		this.notifyListeners(event);
	}

	/**
	 * Trackea el acceso a una key para estadísticas de frecuencia
	 */
	private trackKeyAccess(key: string): void {
		const existing = this.keyFrequency.get(key);
		if (existing) {
			existing.hits++;
			existing.lastAccess = Date.now();
		} else {
			this.keyFrequency.set(key, {
				key,
				hits: 1,
				lastAccess: Date.now(),
			});
		}
	}

	/**
	 * Notifica a todos los listeners sobre el cambio en las estadísticas
	 */
	private notifyListeners(event: CacheEvent): void {
		if (this.listeners.size === 0) return;

		const stats = this.getExtendedStats();
		this.listeners.forEach((listener) => {
			try {
				listener(stats, event);
			} catch (error) {
				// Evitar que un listener con error rompa los demás
				console.error("Error in stats listener:", error);
			}
		});
	}

	/**
	 * Obtiene las estadísticas básicas del cache
	 * Compatible con la interfaz CacheStats existente
	 */
	getStats(): CacheStats {
		const total = this.stats.hits + this.stats.misses;
		const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

		return {
			hits: this.stats.hits,
			misses: this.stats.misses,
			hitRate: Number(hitRate.toFixed(2)),
		};
	}

	/**
	 * Obtiene estadísticas extendidas con más detalles
	 */
	getExtendedStats(): ExtendedCacheStats {
		const total = this.stats.hits + this.stats.misses;
		const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
		const avgInvalidationSize =
			this.stats.invalidations > 0 ? this.stats.totalKeysInvalidated / this.stats.invalidations : 0;

		// Deduplication Rate: % de requests que fueron deduplicados
		const totalFetches = this.stats.sets + this.stats.deduplications;
		const deduplicationRate =
			totalFetches > 0 ? (this.stats.deduplications / totalFetches) * 100 : 0;

		// Average Hit Duration: tiempo promedio de los hits
		const avgHitDuration = this.stats.hits > 0 ? this.stats.totalHitDuration / this.stats.hits : 0;

		// Estimated Cache Size: aproximación basada en sets - deletes
		// Nota: No considera expiración por TTL
		const estimatedCacheSize = this.activeKeys.size;

		return {
			hits: this.stats.hits,
			misses: this.stats.misses,
			hitRate: Number(hitRate.toFixed(2)),
			sets: this.stats.sets,
			deletes: this.stats.deletes,
			invalidations: this.stats.invalidations,
			deduplications: this.stats.deduplications,
			clears: this.stats.clears,
			totalKeysInvalidated: this.stats.totalKeysInvalidated,
			avgInvalidationSize: Number(avgInvalidationSize.toFixed(2)),
			deduplicationRate: Number(deduplicationRate.toFixed(2)),
			avgHitDuration: Number(avgHitDuration.toFixed(2)),
			estimatedCacheSize,
		};
	}

	/**
	 * Obtiene todos los eventos registrados (útil para debugging/testing)
	 */
	getEvents(): readonly CacheEvent[] {
		return this.events;
	}

	/**
	 * Obtiene las queries más frecuentes (Top Keys)
	 * Ordenadas por número de hits, de mayor a menor
	 */
	getTopKeys(limit = 10): KeyFrequency[] {
		return Array.from(this.keyFrequency.values())
			.sort((a, b) => b.hits - a.hits)
			.slice(0, limit);
	}

	/**
	 * Obtiene estadísticas de una key específica
	 */
	getKeyStats(key: string): KeyFrequency | undefined {
		return this.keyFrequency.get(key);
	}

	/**
	 * Suscribe un listener para recibir notificaciones cuando cambien las estadísticas
	 * @param listener Función que se llamará con las stats actualizadas y el evento que las causó
	 * @returns Función para cancelar la suscripción
	 *
	 * @example
	 * ```ts
	 * const unsubscribe = telemetry.subscribe((stats, event) => {
	 *   console.log(`Hit Rate: ${stats.hitRate}%`);
	 *   console.log(`Event: ${event.type}`);
	 * });
	 *
	 * // Más tarde, cancelar suscripción
	 * unsubscribe();
	 * ```
	 */
	subscribe(listener: StatsListener): UnsubscribeFn {
		this.listeners.add(listener);

		// Retornar función para cancelar suscripción
		return () => this.listeners.delete(listener);
	}

	/**
	 * Remueve un listener específico
	 */
	unsubscribe(listener: StatsListener): void {
		this.listeners.delete(listener);
	}

	/**
	 * Remueve todos los listeners
	 */
	unsubscribeAll(): void {
		this.listeners.clear();
	}

	/**
	 * Obtiene el número de listeners activos
	 */
	getListenerCount(): number {
		return this.listeners.size;
	}

	/**
	 * Limpia todos los eventos y estadísticas
	 */
	clear(): void {
		this.events = [];
		this.stats = {
			hits: 0,
			misses: 0,
			sets: 0,
			deletes: 0,
			invalidations: 0,
			deduplications: 0,
			clears: 0,
			totalKeysInvalidated: 0,
			totalHitDuration: 0,
		};
		this.keyFrequency.clear();
		this.activeKeys.clear();
	}
}
