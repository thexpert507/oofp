# Listeners de Telemetría (Hooks Reactivos)

El sistema de telemetría incluye un mecanismo de **suscripción/listeners** que te permite reaccionar en tiempo real a los cambios en las estadísticas del cache, sin necesidad de hacer polling constante.

## 🎯 ¿Por Qué Usar Listeners?

### ❌ Sin Listeners (Polling)
```typescript
// Ineficiente: polling cada segundo
setInterval(() => {
  const stats = telemetry.getExtendedStats();
  updateUI(stats);
}, 1000);
```

### ✅ Con Listeners (Reactivo)
```typescript
// Eficiente: solo se ejecuta cuando hay cambios
telemetry.subscribe((stats, event) => {
  updateUI(stats);
});
```

## 📚 API de Listeners

### `subscribe(listener: StatsListener): UnsubscribeFn`

Suscribe una función que se ejecutará cada vez que cambien las estadísticas.

**Parámetros:**
- `stats: ExtendedCacheStats` - Estadísticas actualizadas
- `event: CacheEvent` - Evento que causó el cambio

**Retorna:** Función para cancelar la suscripción

```typescript
const unsubscribe = telemetry.subscribe((stats, event) => {
  console.log(`Event: ${event.type}`);
  console.log(`Hit Rate: ${stats.hitRate}%`);
});

// Más tarde...
unsubscribe();
```

### `unsubscribe(listener: StatsListener): void`

Remueve un listener específico.

```typescript
const myListener = (stats, event) => {
  console.log(stats);
};

telemetry.subscribe(myListener);

// Más tarde...
telemetry.unsubscribe(myListener);
```

### `unsubscribeAll(): void`

Remueve todos los listeners.

```typescript
telemetry.unsubscribeAll();
```

### `getListenerCount(): number`

Obtiene el número de listeners activos.

```typescript
const count = telemetry.getListenerCount();
console.log(`Active listeners: ${count}`);
```

## 💡 Casos de Uso

### 1. Dashboard en Tiempo Real

```typescript
import { InMemoryTelemetryCollector, QueryClientImpl } from "@oofp/query";

const telemetry = new InMemoryTelemetryCollector();
const client = new QueryClientImpl({ telemetry });

// Actualizar dashboard automáticamente
telemetry.subscribe((stats) => {
  document.getElementById("hit-rate").textContent = `${stats.hitRate}%`;
  document.getElementById("cache-size").textContent = stats.estimatedCacheSize;
  document.getElementById("deduplication").textContent = `${stats.deduplicationRate}%`;
  
  // Actualizar gráfico
  updateChart(stats);
});
```

### 2. React Hook Personalizado

```typescript
import { useEffect, useState } from "react";
import { telemetry } from "./query-client";
import type { ExtendedCacheStats } from "@oofp/query";

export function useCacheStats() {
  const [stats, setStats] = useState<ExtendedCacheStats | null>(null);

  useEffect(() => {
    // Obtener stats inicial
    setStats(telemetry.getExtendedStats());

    // Suscribirse a cambios
    const unsubscribe = telemetry.subscribe((newStats) => {
      setStats(newStats);
    });

    // Cleanup
    return unsubscribe;
  }, []);

  return stats;
}

// Uso en componente
function CacheDashboard() {
  const stats = useCacheStats();

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h2>Cache Performance</h2>
      <p>Hit Rate: {stats.hitRate}%</p>
      <p>Cache Size: {stats.estimatedCacheSize} keys</p>
      <p>Deduplications: {stats.deduplications}</p>
    </div>
  );
}
```

### 3. Vue Composable

```typescript
import { ref, onMounted, onUnmounted } from "vue";
import { telemetry } from "./query-client";

export function useCacheStats() {
  const stats = ref(telemetry.getExtendedStats());
  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    unsubscribe = telemetry.subscribe((newStats) => {
      stats.value = newStats;
    });
  });

  onUnmounted(() => {
    if (unsubscribe) unsubscribe();
  });

  return { stats };
}
```

### 4. Alertas Automáticas

```typescript
telemetry.subscribe((stats, event) => {
  // Alerta cuando el hit rate baja
  if (stats.hitRate < 50 && stats.hits + stats.misses > 100) {
    console.warn("⚠️ Low cache hit rate:", stats.hitRate);
    sendAlert({
      type: "low_hit_rate",
      value: stats.hitRate,
    });
  }

  // Alerta de invalidación masiva
  if (event.type === "invalidate" && event.keysAffected > 100) {
    console.warn("⚠️ Large invalidation:", event.keysAffected, "keys");
    sendAlert({
      type: "large_invalidation",
      keysAffected: event.keysAffected,
      tags: event.tags,
    });
  }

  // Alerta de cache muy grande
  if (stats.estimatedCacheSize > 10000) {
    console.warn("⚠️ Cache too large:", stats.estimatedCacheSize);
    sendAlert({
      type: "cache_overflow",
      size: stats.estimatedCacheSize,
    });
  }
});
```

### 5. Logging Estructurado

```typescript
telemetry.subscribe((stats, event) => {
  // Log solo eventos importantes
  if (
    event.type === "invalidate" ||
    event.type === "clear" ||
    (event.type === "deduplicate" && event.waiters > 5)
  ) {
    logger.info({
      event: event.type,
      stats: {
        hitRate: stats.hitRate,
        cacheSize: stats.estimatedCacheSize,
      },
      timestamp: Date.now(),
    });
  }
});
```

### 6. Métricas a APM (Application Performance Monitoring)

```typescript
import { datadogRum } from "@datadog/browser-rum";

telemetry.subscribe((stats, event) => {
  // Enviar métricas a Datadog
  datadogRum.addAction("cache_event", {
    type: event.type,
    hitRate: stats.hitRate,
    cacheSize: stats.estimatedCacheSize,
    deduplicationRate: stats.deduplicationRate,
  });

  // Enviar métricas personalizadas
  if (event.type === "hit") {
    datadogRum.addTiming("cache_hit_duration", event.duration);
  }
});
```

### 7. Debug en Desarrollo

```typescript
if (process.env.NODE_ENV === "development") {
  telemetry.subscribe((stats, event) => {
    console.group(`[Cache Event] ${event.type}`);
    console.log("Event:", event);
    console.log("Current Stats:", {
      hitRate: stats.hitRate,
      cacheSize: stats.estimatedCacheSize,
      deduplications: stats.deduplications,
    });
    console.groupEnd();
  });
}
```

### 8. Throttling de Notificaciones

Si recibes demasiadas notificaciones, puedes implementar throttling:

```typescript
let lastUpdate = 0;
const THROTTLE_MS = 1000; // 1 segundo

telemetry.subscribe((stats) => {
  const now = Date.now();
  if (now - lastUpdate > THROTTLE_MS) {
    updateUI(stats);
    lastUpdate = now;
  }
});
```

### 9. Debouncing de Notificaciones

Para evitar actualizaciones muy frecuentes:

```typescript
let debounceTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 500;

telemetry.subscribe((stats) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(() => {
    updateUI(stats);
  }, DEBOUNCE_MS);
});
```

### 10. Filtrar por Tipo de Evento

```typescript
// Solo reaccionar a hits y misses
telemetry.subscribe((stats, event) => {
  if (event.type === "hit" || event.type === "miss") {
    updateHitRateChart(stats.hitRate);
  }
});

// Solo reaccionar a invalidaciones
telemetry.subscribe((stats, event) => {
  if (event.type === "invalidate") {
    console.log(`Invalidated ${event.keysAffected} keys with tags:`, event.tags);
  }
});
```

## 🔥 Ejemplo Completo: Dashboard Interactivo

```typescript
import { InMemoryTelemetryCollector, QueryClientImpl } from "@oofp/query";

const telemetry = new InMemoryTelemetryCollector();
const client = new QueryClientImpl({ telemetry });

// Estado del dashboard
const dashboard = {
  hitRate: 0,
  cacheSize: 0,
  avgDuration: 0,
  recentEvents: [] as string[],
};

// Suscribirse a cambios
const unsubscribe = telemetry.subscribe((stats, event) => {
  // Actualizar métricas
  dashboard.hitRate = stats.hitRate;
  dashboard.cacheSize = stats.estimatedCacheSize;
  dashboard.avgDuration = stats.avgHitDuration;

  // Mantener historial de eventos recientes (últimos 10)
  dashboard.recentEvents.unshift(event.type);
  if (dashboard.recentEvents.length > 10) {
    dashboard.recentEvents.pop();
  }

  // Renderizar dashboard
  renderDashboard();
});

function renderDashboard() {
  console.clear();
  console.log("═══════════════════════════════════");
  console.log("      CACHE DASHBOARD (LIVE)       ");
  console.log("═══════════════════════════════════");
  console.log(`Hit Rate: ${dashboard.hitRate}%`);
  console.log(`Cache Size: ${dashboard.cacheSize} keys`);
  console.log(`Avg Duration: ${dashboard.avgDuration}ms`);
  console.log("\nRecent Events:");
  dashboard.recentEvents.forEach((event, i) => {
    console.log(`  ${i + 1}. ${event}`);
  });
  console.log("═══════════════════════════════════");
}

// Usar el cliente normalmente
// El dashboard se actualizará automáticamente

// Cleanup cuando ya no se necesite
// unsubscribe();
```

## 🎨 Integración con UI Frameworks

### Angular

```typescript
import { Injectable, OnDestroy } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { telemetry } from "./query-client";
import type { ExtendedCacheStats } from "@oofp/query";

@Injectable({ providedIn: "root" })
export class CacheStatsService implements OnDestroy {
  private statsSubject = new BehaviorSubject<ExtendedCacheStats>(
    telemetry.getExtendedStats()
  );
  public stats$: Observable<ExtendedCacheStats> = this.statsSubject.asObservable();
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.unsubscribe = telemetry.subscribe((stats) => {
      this.statsSubject.next(stats);
    });
  }

  ngOnDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

// Uso en componente
@Component({
  selector: "app-cache-stats",
  template: `
    <div *ngIf="stats$ | async as stats">
      <h3>Cache Stats</h3>
      <p>Hit Rate: {{ stats.hitRate }}%</p>
      <p>Cache Size: {{ stats.estimatedCacheSize }}</p>
    </div>
  `,
})
export class CacheStatsComponent {
  stats$ = this.cacheStats.stats$;

  constructor(private cacheStats: CacheStatsService) {}
}
```

### Svelte

```svelte
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { writable } from "svelte/store";
  import { telemetry } from "./query-client";

  const stats = writable(telemetry.getExtendedStats());
  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = telemetry.subscribe((newStats) => {
      stats.set(newStats);
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });
</script>

<div>
  <h2>Cache Performance</h2>
  <p>Hit Rate: {$stats.hitRate}%</p>
  <p>Cache Size: {$stats.estimatedCacheSize} keys</p>
  <p>Deduplications: {$stats.deduplications}</p>
</div>
```

## 🛡️ Manejo de Errores

El sistema maneja errores en listeners automáticamente:

```typescript
telemetry.subscribe(() => {
  // Este listener funciona bien
  console.log("Listener 1 OK");
});

telemetry.subscribe(() => {
  // Este listener tiene un error
  throw new Error("Oops!");
});

telemetry.subscribe(() => {
  // Este listener también funciona
  // No se ve afectado por el error del anterior
  console.log("Listener 3 OK");
});
```

Los errores se loguean automáticamente pero no rompen otros listeners.

## ⚡ Performance

- **Eficiente**: Solo notifica cuando hay cambios reales
- **Sin overhead**: Si no hay listeners, no hay costo
- **Try-catch**: Errores en listeners no afectan el cache
- **Limpieza**: Usa `unsubscribe()` para evitar memory leaks

## 📝 Best Practices

1. **Siempre limpiar**: Usa `unsubscribe()` cuando el componente se desmonta
2. **Filtrar eventos**: No todos los eventos requieren actualización de UI
3. **Debounce/Throttle**: Para UIs con muchas actualizaciones
4. **Error handling**: Los listeners pueden fallar, prepárate
5. **Evitar side effects pesados**: Los listeners se ejecutan síncronamente

## 🎯 Resumen

Los listeners te permiten:
- ✅ Actualizar UI automáticamente
- ✅ Monitorear cache en tiempo real
- ✅ Enviar alertas cuando sea necesario
- ✅ Integrar con APM/observabilidad
- ✅ Crear hooks reactivos para frameworks
- ✅ Debug eficiente en desarrollo

**¡No más polling! Reacciona a cambios en tiempo real.** 🚀
