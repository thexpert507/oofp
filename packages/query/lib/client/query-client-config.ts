import { CacheStore } from "./cache/cache";
import { TelemetryCollector } from "@/core/cache-events";

/**
 * Configuración del QueryClient
 */
export interface QueryClientConfig {
	defaultTTL?: number; // TTL por defecto en ms (default: 5 minutos)
	maxCacheSize?: number; // Máximo de queries en cache
	cache?: CacheStore; // Cache customizable
	lruCache?: boolean; // Usar LRU Cache para gestión de memoria (default: false)
	telemetry?: TelemetryCollector; // Colector de telemetría (default: InMemoryTelemetryCollector)
}
