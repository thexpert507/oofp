import { describe, it, expect, vi } from "vitest";
import { QueryClientImpl } from "@/client/query-client-impl";
import { InMemoryTelemetryCollector } from "@/core/telemetry-collector";
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

describe("Telemetry Listeners (Hooks)", () => {
	it("should notify listener when stats change", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		const statsHistory: any[] = [];

		// Suscribirse a cambios
		const unsubscribe = telemetry.subscribe((stats, event) => {
			statsHistory.push({ stats: { ...stats }, event });
		});

		// Hacer una query (miss + set)
		await pipe(
			client.fetchQuery({
				queryKey: ["test"],
				queryFn: () => TE.right({ value: 1 }),
			}),
			TE.toPromise,
		);

		// Debería haber notificado 2 veces: miss y set
		expect(statsHistory.length).toBeGreaterThanOrEqual(2);

		// Verificar que las stats cambiaron
		const lastStats = statsHistory[statsHistory.length - 1].stats;
		expect(lastStats.misses).toBeGreaterThan(0);
		expect(lastStats.sets).toBeGreaterThan(0);

		unsubscribe();
	});

	it("should provide event type in notification", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		const events: string[] = [];

		telemetry.subscribe((stats, event) => {
			events.push(event.type);
		});

		// Primera query (miss + set)
		await pipe(
			client.fetchQuery({
				queryKey: ["test"],
				queryFn: () => TE.right({ value: 1 }),
			}),
			TE.toPromise,
		);

		// Segunda query (hit)
		await pipe(
			client.fetchQuery({
				queryKey: ["test"],
				queryFn: () => TE.right({ value: 1 }),
			}),
			TE.toPromise,
		);

		expect(events).toContain("miss");
		expect(events).toContain("set");
		expect(events).toContain("hit");
	});

	it("should allow multiple listeners", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		let listener1Called = 0;
		let listener2Called = 0;

		telemetry.subscribe(() => {
			listener1Called++;
		});

		telemetry.subscribe(() => {
			listener2Called++;
		});

		await pipe(
			client.fetchQuery({
				queryKey: ["test"],
				queryFn: () => TE.right({ value: 1 }),
			}),
			TE.toPromise,
		);

		// Ambos listeners deberían haber sido llamados
		expect(listener1Called).toBeGreaterThan(0);
		expect(listener2Called).toBeGreaterThan(0);
		expect(listener1Called).toBe(listener2Called);
	});

	it("should allow unsubscribe", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		let callCount = 0;

		const unsubscribe = telemetry.subscribe(() => {
			callCount++;
		});

		// Primera query
		await pipe(
			client.fetchQuery({
				queryKey: ["test", 1],
				queryFn: () => TE.right({ value: 1 }),
			}),
			TE.toPromise,
		);

		const countAfterFirst = callCount;
		expect(countAfterFirst).toBeGreaterThan(0);

		// Desuscribirse
		unsubscribe();

		// Segunda query
		await pipe(
			client.fetchQuery({
				queryKey: ["test", 2],
				queryFn: () => TE.right({ value: 2 }),
			}),
			TE.toPromise,
		);

		// El contador NO debería haber aumentado
		expect(callCount).toBe(countAfterFirst);
	});

	it("should track real-time hit rate changes", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		const hitRateHistory: number[] = [];

		telemetry.subscribe((stats) => {
			hitRateHistory.push(stats.hitRate);
		});

		// Primera query - miss (hit rate = 0%)
		await pipe(
			client.fetchQuery({
				queryKey: ["test"],
				queryFn: () => TE.right({ value: 1 }),
			}),
			TE.toPromise,
		);

		// Segunda query - hit (hit rate = 50%)
		await pipe(
			client.fetchQuery({
				queryKey: ["test"],
				queryFn: () => TE.right({ value: 1 }),
			}),
			TE.toPromise,
		);

		// Tercera query - hit (hit rate = 66.67%)
		await pipe(
			client.fetchQuery({
				queryKey: ["test"],
				queryFn: () => TE.right({ value: 1 }),
			}),
			TE.toPromise,
		);

		// Verificar que el hit rate fue cambiando
		expect(hitRateHistory.length).toBeGreaterThan(0);

		// Encontrar el último hit rate registrado
		const finalHitRate = hitRateHistory[hitRateHistory.length - 1];
		expect(finalHitRate).toBeGreaterThan(0);
	});

	it("should notify on invalidation with keys affected", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		let invalidationEvent: any = null;

		telemetry.subscribe((stats, event) => {
			if (event.type === "invalidate") {
				invalidationEvent = { stats, event };
			}
		});

		// Crear queries
		await pipe(client.setQueryData(["users", 1], { id: 1 }), TE.toPromise);
		await pipe(client.setQueryData(["users", 2], { id: 2 }), TE.toPromise);

		// Invalidar
		await pipe(client.invalidateQueries(["users"]), TE.toPromise);

		expect(invalidationEvent).not.toBeNull();
		expect(invalidationEvent.event.keysAffected).toBe(2);
		expect(invalidationEvent.stats.invalidations).toBeGreaterThan(0);
	});

	it("should not break other listeners if one throws error", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		let goodListener1Called = false;
		let goodListener2Called = false;

		// Suprimir console.error durante este test
		const originalConsoleError = console.error;
		console.error = () => {
			/* Silenciar errores esperados */
		};

		try {
			// Listener bueno 1
			telemetry.subscribe(() => {
				goodListener1Called = true;
			});

			// Listener malo que lanza error
			telemetry.subscribe(() => {
				throw new Error("Listener error!");
			});

			// Listener bueno 2
			telemetry.subscribe(() => {
				goodListener2Called = true;
			});

			// Hacer query
			await pipe(
				client.fetchQuery({
					queryKey: ["test"],
					queryFn: () => TE.right({ value: 1 }),
				}),
				TE.toPromise,
			);

			// Los listeners buenos deberían haber sido llamados
			expect(goodListener1Called).toBe(true);
			expect(goodListener2Called).toBe(true);
		} finally {
			// Restaurar console.error
			console.error = originalConsoleError;
		}
	});

	it("should provide unsubscribeAll method", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		let calls = 0;

		telemetry.subscribe(() => calls++);
		telemetry.subscribe(() => calls++);
		telemetry.subscribe(() => calls++);

		expect(telemetry.getListenerCount()).toBe(3);

		// Primera query
		await pipe(
			client.fetchQuery({
				queryKey: ["test"],
				queryFn: () => TE.right({ value: 1 }),
			}),
			TE.toPromise,
		);

		const callsAfterFirst = calls;
		expect(callsAfterFirst).toBeGreaterThan(0);

		// Desuscribir todos
		telemetry.unsubscribeAll();
		expect(telemetry.getListenerCount()).toBe(0);

		// Segunda query
		await pipe(
			client.fetchQuery({
				queryKey: ["test", 2],
				queryFn: () => TE.right({ value: 2 }),
			}),
			TE.toPromise,
		);

		// Los contadores NO deberían haber aumentado
		expect(calls).toBe(callsAfterFirst);
	});

	it("should work as a reactive hook for UI updates", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		// Simular un componente de UI que muestra stats
		const uiState = {
			hitRate: 0,
			cacheSize: 0,
			deduplications: 0,
		};

		// "Hook" que actualiza el UI
		telemetry.subscribe((stats) => {
			uiState.hitRate = stats.hitRate;
			uiState.cacheSize = stats.estimatedCacheSize;
			uiState.deduplications = stats.deduplications;
		});

		// Interacciones del usuario
		await pipe(
			client.fetchQuery({
				queryKey: ["users"],
				queryFn: () => TE.right([1, 2, 3]),
			}),
			TE.toPromise,
		);

		// El UI state debería actualizarse automáticamente
		expect(uiState.cacheSize).toBeGreaterThan(0);

		// Más queries
		for (let i = 0; i < 5; i++) {
			await pipe(
				client.fetchQuery({
					queryKey: ["users"],
					queryFn: () => TE.right([1, 2, 3]),
				}),
				TE.toPromise,
			);
		}

		// El hit rate debería actualizarse
		expect(uiState.hitRate).toBeGreaterThan(0);
	});

	it("should debounce rapid notifications if needed", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		const notifications: number[] = [];

		// Listener con debounce manual
		let debounceTimer: NodeJS.Timeout | null = null;
		telemetry.subscribe((stats) => {
			if (debounceTimer) clearTimeout(debounceTimer);

			debounceTimer = setTimeout(() => {
				notifications.push(stats.hits);
			}, 10);
		});

		// Hacer muchas queries rápidas
		for (let i = 0; i < 10; i++) {
			await pipe(client.setQueryData(["test", i], { value: i }), TE.toPromise);
		}

		// Esperar el debounce
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Solo debería haber una notificación final (debounced)
		expect(notifications.length).toBeLessThanOrEqual(2);
	});
});
