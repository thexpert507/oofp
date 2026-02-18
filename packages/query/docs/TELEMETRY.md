# Sistema de Telemetría y Eventos de Cache

El sistema de telemetría permite separar las estadísticas y métricas del cache de su implementación, usando un patrón basado en eventos.

## Características

- **Desacoplamiento completo**: El cache emite eventos, los colectores los procesan
- **Extensible**: Crea colectores personalizados para diferentes backends (Prometheus, DataDog, etc.)
- **Métricas detalladas**: Trackea hits, misses, sets, deletes, invalidaciones y deduplicaciones
- **Performance insights**: Captura duración de operaciones y tamaños de datos

## Uso Básico

### Con el colector por defecto (en memoria)

```typescript
import { QueryClientImpl } from "@oofp/query";

const client = new QueryClientImpl();

// El cliente usa InMemoryTelemetryCollector por defecto
const stats = client.getStats();
console.log(stats); // { hits: 10, misses: 5, hitRate: 66.67 }
```

### Con colector personalizado

```typescript
import { QueryClientImpl, InMemoryTelemetryCollector } from "@oofp/query";

const telemetry = new InMemoryTelemetryCollector();
const client = new QueryClientImpl({ telemetry });

// Acceder a métricas extendidas
const extendedStats = telemetry.getExtendedStats();
console.log(extendedStats);
// {
//   hits: 10,
//   misses: 5,
//   hitRate: 66.67,
//   sets: 15,
//   deletes: 2,
//   invalidations: 3,
//   deduplications: 5,
//   clears: 1,
//   totalKeysInvalidated: 8,
//   avgInvalidationSize: 2.67
// }

// Ver todos los eventos (útil para debugging)
const events = telemetry.getEvents();
console.log(events);
```

## Tipos de Eventos

### Hit Event
Se emite cuando se encuentra un valor en el cache.

```typescript
{
  type: 'hit',
  key: 'serialized-query-key',
  tags: ['[0]:users', '[1]:123'],
  duration: 0.5  // tiempo en ms
}
```

### Miss Event
Se emite cuando NO se encuentra un valor en el cache.

```typescript
{
  type: 'miss',
  key: 'serialized-query-key',
  tags: ['[0]:posts', '[1]:456']
}
```

### Set Event
Se emite cuando se guarda un valor en el cache.

```typescript
{
  type: 'set',
  key: 'serialized-query-key',
  tags: ['[0]:users', '[1]:123'],
  size: 1024,    // tamaño estimado en bytes
  ttl: 300000    // TTL en ms
}
```

### Invalidate Event
Se emite cuando se invalidan queries por tags.

```typescript
{
  type: 'invalidate',
  tags: ['[0]:users'],
  keysAffected: 5  // cantidad de queries invalidadas
}
```

### Deduplicate Event
Se emite cuando múltiples requests comparten la misma ejecución.

```typescript
{
  type: 'deduplicate',
  key: 'serialized-query-key',
  waiters: 3  // número de requests esperando
}
```

### Delete Event
Se emite cuando se elimina una query específica.

```typescript
{
  type: 'delete',
  key: 'serialized-query-key',
  tags: ['[0]:user', '[1]:1']
}
```

### Clear Event
Se emite cuando se limpia todo el cache.

```typescript
{
  type: 'clear'
}
```

## Crear un Colector Personalizado

Puedes crear tu propio colector para enviar métricas a diferentes backends:

### Ejemplo: Colector para Prometheus

```typescript
import { TelemetryCollector, CacheEvent } from "@oofp/query";
import { Counter, Histogram, Registry } from "prom-client";

export class PrometheusTelemetryCollector implements TelemetryCollector {
  private hits: Counter;
  private misses: Counter;
  private sets: Counter;
  private invalidations: Counter;
  private deduplications: Counter;
  private operationDuration: Histogram;
  private dataSize: Histogram;

  constructor(registry: Registry) {
    this.hits = new Counter({
      name: "cache_hits_total",
      help: "Total number of cache hits",
      registers: [registry],
    });

    this.misses = new Counter({
      name: "cache_misses_total",
      help: "Total number of cache misses",
      registers: [registry],
    });

    this.sets = new Counter({
      name: "cache_sets_total",
      help: "Total number of cache sets",
      registers: [registry],
    });

    this.invalidations = new Counter({
      name: "cache_invalidations_total",
      help: "Total number of cache invalidations",
      labelNames: ["keys_affected"],
      registers: [registry],
    });

    this.deduplications = new Counter({
      name: "cache_deduplications_total",
      help: "Total number of deduplicated requests",
      registers: [registry],
    });

    this.operationDuration = new Histogram({
      name: "cache_operation_duration_ms",
      help: "Duration of cache operations in milliseconds",
      buckets: [0.1, 0.5, 1, 5, 10, 50, 100],
      registers: [registry],
    });

    this.dataSize = new Histogram({
      name: "cache_data_size_bytes",
      help: "Size of cached data in bytes",
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [registry],
    });
  }

  record(event: CacheEvent): void {
    switch (event.type) {
      case "hit":
        this.hits.inc();
        this.operationDuration.observe(event.duration);
        break;
      case "miss":
        this.misses.inc();
        break;
      case "set":
        this.sets.inc();
        this.dataSize.observe(event.size);
        break;
      case "invalidate":
        this.invalidations.inc({ keys_affected: event.keysAffected });
        break;
      case "deduplicate":
        this.deduplications.inc();
        break;
    }
  }
}

// Uso
const registry = new Registry();
const telemetry = new PrometheusTelemetryCollector(registry);
const client = new QueryClientImpl({ telemetry });
```

### Ejemplo: Colector para Logging

```typescript
import { TelemetryCollector, CacheEvent } from "@oofp/query";

export class LoggingTelemetryCollector implements TelemetryCollector {
  constructor(private logger: Console = console) {}

  record(event: CacheEvent): void {
    switch (event.type) {
      case "hit":
        this.logger.log(`[CACHE HIT] Key: ${event.key}, Duration: ${event.duration}ms`);
        break;
      case "miss":
        this.logger.log(`[CACHE MISS] Key: ${event.key}`);
        break;
      case "set":
        this.logger.log(`[CACHE SET] Key: ${event.key}, Size: ${event.size} bytes, TTL: ${event.ttl}ms`);
        break;
      case "invalidate":
        this.logger.log(`[CACHE INVALIDATE] Tags: ${event.tags.join(", ")}, Keys affected: ${event.keysAffected}`);
        break;
      case "deduplicate":
        this.logger.log(`[CACHE DEDUPLICATE] Key: ${event.key}, Waiters: ${event.waiters}`);
        break;
      case "delete":
        this.logger.log(`[CACHE DELETE] Key: ${event.key}`);
        break;
      case "clear":
        this.logger.log(`[CACHE CLEAR]`);
        break;
    }
  }
}
```

### Ejemplo: Colector Compuesto (múltiples destinos)

```typescript
import { TelemetryCollector, CacheEvent } from "@oofp/query";

export class CompositeTelemetryCollector implements TelemetryCollector {
  constructor(private collectors: TelemetryCollector[]) {}

  record(event: CacheEvent): void {
    for (const collector of this.collectors) {
      collector.record(event);
    }
  }
}

// Uso: enviar eventos a múltiples destinos
const telemetry = new CompositeTelemetryCollector([
  new InMemoryTelemetryCollector(),
  new PrometheusTelemetryCollector(registry),
  new LoggingTelemetryCollector(),
]);

const client = new QueryClientImpl({ telemetry });
```

## Ventajas del Sistema de Eventos

1. **Separación de responsabilidades**: El cache solo almacena, no gestiona métricas
2. **Testing más fácil**: Mock del colector sin afectar el cache
3. **Extensibilidad**: Añade nuevos colectores sin modificar el core
4. **Performance insights**: Analiza duración, tamaños y patrones de uso
5. **Debugging**: Inspecciona todos los eventos en tiempo real
6. **Producción**: Integra con sistemas de monitoreo existentes

## API Reference

### TelemetryCollector Interface

```typescript
interface TelemetryCollector {
  record(event: CacheEvent): void;
}
```

### InMemoryTelemetryCollector

```typescript
class InMemoryTelemetryCollector implements TelemetryCollector {
  record(event: CacheEvent): void;
  getStats(): CacheStats;
  getExtendedStats(): ExtendedCacheStats;
  getEvents(): readonly CacheEvent[];
  clear(): void;
}
```

### CacheStats

```typescript
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}
```

### ExtendedCacheStats

```typescript
interface ExtendedCacheStats extends CacheStats {
  sets: number;
  deletes: number;
  invalidations: number;
  deduplications: number;
  clears: number;
  totalKeysInvalidated: number;
  avgInvalidationSize: number;
}
```
