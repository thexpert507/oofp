# Métricas Avanzadas de Telemetría

Con la implementación actual del sistema de eventos, **SÍ puedes calcular todas las métricas** que necesitas:

## ✅ Métricas Disponibles

### 1. Hit Rate (Tasa de Aciertos)
**Fórmula:** `hits / (hits + misses) * 100`

```typescript
const stats = telemetry.getExtendedStats();
console.log(`Hit Rate: ${stats.hitRate}%`);
// Hit Rate: 75.5%
```

### 2. Deduplication Rate (Tasa de Deduplicación)
**Fórmula:** `deduplications / (sets + deduplications) * 100`

Muestra qué porcentaje de requests se deduplicaron (no hicieron fetch real).

```typescript
const stats = telemetry.getExtendedStats();
console.log(`Deduplication Rate: ${stats.deduplicationRate}%`);
console.log(`Requests saved: ${stats.deduplications}`);
// Deduplication Rate: 45.2%
// Requests saved: 123
```

### 3. Average Duration (Duración Promedio)
**Fórmula:** `totalHitDuration / hits`

Tiempo promedio en ms para obtener un valor del cache.

```typescript
const stats = telemetry.getExtendedStats();
console.log(`Average Hit Duration: ${stats.avgHitDuration}ms`);
// Average Hit Duration: 0.23ms
```

### 4. Cache Size (Tamaño del Cache)
**Estimación:** `activeKeys.size` (tracking de sets - deletes - clears)

```typescript
const stats = telemetry.getExtendedStats();
console.log(`Estimated Cache Size: ${stats.estimatedCacheSize} keys`);
// Estimated Cache Size: 42 keys
```

**Nota:** Es una estimación porque no considera expiración por TTL. Para un valor exacto, necesitarías consultar el store directamente.

### 5. Invalidation Impact (Impacto de Invalidaciones)
**Métricas:** `totalKeysInvalidated`, `avgInvalidationSize`

```typescript
const stats = telemetry.getExtendedStats();
console.log(`Total Keys Invalidated: ${stats.totalKeysInvalidated}`);
console.log(`Average Invalidation Size: ${stats.avgInvalidationSize}`);
console.log(`Number of Invalidations: ${stats.invalidations}`);
// Total Keys Invalidated: 150
// Average Invalidation Size: 25
// Number of Invalidations: 6
```

### 6. Top Keys (Queries Más Frecuentes)
**Tracking:** Mapa de frecuencia con contador por key

```typescript
const topKeys = telemetry.getTopKeys(10);

console.log("Top 10 Most Accessed Queries:");
topKeys.forEach((keyStats, index) => {
  console.log(`${index + 1}. ${keyStats.key}`);
  console.log(`   Hits: ${keyStats.hits}`);
  console.log(`   Last Access: ${new Date(keyStats.lastAccess).toISOString()}`);
});

// Top 10 Most Accessed Queries:
// 1. ["users","list"]
//    Hits: 1534
//    Last Access: 2025-11-12T14:38:00.000Z
// 2. ["posts","123"]
//    Hits: 892
//    Last Access: 2025-11-12T14:37:55.000Z
// ...
```

## 📊 Panel de Métricas Completo

Ejemplo de función que genera un dashboard con todas las métricas:

```typescript
import { InMemoryTelemetryCollector } from "@oofp/query";

function printCacheMetrics(telemetry: InMemoryTelemetryCollector) {
  const stats = telemetry.getExtendedStats();
  const topKeys = telemetry.getTopKeys(5);

  console.log("═══════════════════════════════════════");
  console.log("       CACHE PERFORMANCE METRICS       ");
  console.log("═══════════════════════════════════════");
  
  // Hit Rate
  console.log("\n📈 HIT RATE");
  console.log(`   Hits: ${stats.hits}`);
  console.log(`   Misses: ${stats.misses}`);
  console.log(`   Hit Rate: ${stats.hitRate}%`);
  
  // Deduplication
  console.log("\n🔄 DEDUPLICATION");
  console.log(`   Deduplications: ${stats.deduplications}`);
  console.log(`   Deduplication Rate: ${stats.deduplicationRate}%`);
  console.log(`   → Saved ${stats.deduplications} unnecessary fetches`);
  
  // Performance
  console.log("\n⚡ PERFORMANCE");
  console.log(`   Average Hit Duration: ${stats.avgHitDuration}ms`);
  
  // Cache Size
  console.log("\n💾 CACHE SIZE");
  console.log(`   Estimated Keys: ${stats.estimatedCacheSize}`);
  console.log(`   Total Sets: ${stats.sets}`);
  console.log(`   Total Deletes: ${stats.deletes}`);
  console.log(`   Clears: ${stats.clears}`);
  
  // Data Size
  console.log("\n📦 DATA SIZE");
  console.log(`   Total Data: ${(stats.totalDataSize / 1024).toFixed(2)} KB`);
  console.log(`   Average Data Size: ${stats.avgDataSize} bytes`);
  
  // Invalidations
  console.log("\n🗑️  INVALIDATION IMPACT");
  console.log(`   Total Invalidations: ${stats.invalidations}`);
  console.log(`   Keys Invalidated: ${stats.totalKeysInvalidated}`);
  console.log(`   Average Impact: ${stats.avgInvalidationSize} keys/invalidation`);
  
  // Top Keys
  console.log("\n🔥 TOP 5 MOST ACCESSED");
  topKeys.forEach((key, index) => {
    const lastAccess = new Date(key.lastAccess);
    const timeAgo = Math.round((Date.now() - key.lastAccess) / 1000);
    console.log(`   ${index + 1}. ${key.key}`);
    console.log(`      Hits: ${key.hits} (${timeAgo}s ago)`);
  });
  
  console.log("\n═══════════════════════════════════════");
}

// Uso
const telemetry = new InMemoryTelemetryCollector();
const client = new QueryClientImpl({ telemetry });

// ... usar el cliente ...

// Imprimir métricas cada 60 segundos
setInterval(() => {
  printCacheMetrics(telemetry);
}, 60000);
```

### Salida de Ejemplo:

```
═══════════════════════════════════════
       CACHE PERFORMANCE METRICS       
═══════════════════════════════════════

📈 HIT RATE
   Hits: 8542
   Misses: 1234
   Hit Rate: 87.38%

🔄 DEDUPLICATION
   Deduplications: 456
   Deduplication Rate: 27.04%
   → Saved 456 unnecessary fetches

⚡ PERFORMANCE
   Average Hit Duration: 0.45ms

💾 CACHE SIZE
   Estimated Keys: 342
   Total Sets: 1690
   Total Deletes: 23
   Clears: 2

📦 DATA SIZE
   Total Data: 245.67 KB
   Average Data Size: 148.9 bytes

🗑️  INVALIDATION IMPACT
   Total Invalidations: 45
   Keys Invalidated: 890
   Average Impact: 19.78 keys/invalidation

🔥 TOP 5 MOST ACCESSED
   1. ["users","list"]
      Hits: 1534 (5s ago)
   2. ["posts","featured"]
      Hits: 892 (12s ago)
   3. ["categories","all"]
      Hits: 678 (8s ago)
   4. ["user","profile","123"]
      Hits: 445 (3s ago)
   5. ["notifications","count"]
      Hits: 389 (1s ago)

═══════════════════════════════════════
```

## 🎯 Casos de Uso

### 1. Optimización de Cache
Identifica queries frecuentes que deberían tener TTL más largo:

```typescript
const topKeys = telemetry.getTopKeys(20);
const frequentKeys = topKeys.filter(k => k.hits > 1000);

console.log("Queries que deberían tener mayor TTL:");
frequentKeys.forEach(k => {
  console.log(`- ${k.key}: ${k.hits} hits`);
});
```

### 2. Detección de Problemas
Identifica bajo hit rate:

```typescript
const stats = telemetry.getExtendedStats();
if (stats.hitRate < 50) {
  console.warn(`⚠️  Low hit rate: ${stats.hitRate}%`);
  console.warn("Consider:");
  console.warn("- Increasing TTL");
  console.warn("- Reviewing cache invalidation strategy");
  console.warn("- Checking query key stability");
}
```

### 3. Monitoreo de Deduplicación
Verifica efectividad de deduplicación:

```typescript
const stats = telemetry.getExtendedStats();
if (stats.deduplicationRate > 20) {
  console.log(`✅ Great! ${stats.deduplicationRate}% of requests were deduplicated`);
  console.log(`   Saved ${stats.deduplications} backend calls`);
}
```

### 4. Análisis de Invalidación
Detecta invalidaciones masivas:

```typescript
const events = telemetry.getEvents();
const invalidateEvents = events.filter(e => e.type === 'invalidate');

invalidateEvents
  .filter(e => e.keysAffected > 50)
  .forEach(e => {
    console.warn(`⚠️  Large invalidation: ${e.keysAffected} keys with tags: ${e.tags.join(', ')}`);
  });
```

## 🔧 API Completa

```typescript
// Estadísticas básicas (compatible con versión anterior)
const basicStats = client.getStats();
// { hits, misses, hitRate }

// Estadísticas extendidas
const extendedStats = telemetry.getExtendedStats();
// {
//   hits, misses, hitRate,
//   sets, deletes, invalidations, deduplications, clears,
//   totalKeysInvalidated, avgInvalidationSize,
//   deduplicationRate, avgHitDuration,
//   estimatedCacheSize, totalDataSize, avgDataSize
// }

// Top queries
const topKeys = telemetry.getTopKeys(10);
// [{ key, hits, lastAccess }, ...]

// Stats de una key específica
const keyStats = telemetry.getKeyStats("specific-key-hash");
// { key, hits, lastAccess } | undefined

// Todos los eventos (para análisis detallado)
const allEvents = telemetry.getEvents();
// [CacheEvent, ...]
```

## 📝 Resumen

| Métrica | ✅ Disponible | Método |
|---------|--------------|---------|
| Hit Rate | ✅ Sí | `getExtendedStats().hitRate` |
| Deduplication Rate | ✅ Sí | `getExtendedStats().deduplicationRate` |
| Average Duration | ✅ Sí | `getExtendedStats().avgHitDuration` |
| Cache Size | ✅ Sí* | `getExtendedStats().estimatedCacheSize` |
| Invalidation Impact | ✅ Sí | `getExtendedStats().totalKeysInvalidated` |
| Top Keys | ✅ Sí | `getTopKeys(n)` |

*Nota: `estimatedCacheSize` es una aproximación. No considera TTL expirado.

**¡Todas las métricas que solicitaste están implementadas y funcionando!** 🎉
