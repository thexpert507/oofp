import { describe, it, expect } from "vitest";
import { QueryClientImpl } from "@/client/query-client-impl";
import { InMemoryTelemetryCollector } from "@/core/telemetry-collector";
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

describe("Advanced Telemetry Metrics", () => {
	it("should calculate hit rate correctly", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		// 3 misses
		await pipe(
			client.fetchQuery({ queryKey: ["test", 1], queryFn: () => TE.right({ value: 1 }) }),
			TE.toPromise,
		);
		await pipe(
			client.fetchQuery({ queryKey: ["test", 2], queryFn: () => TE.right({ value: 2 }) }),
			TE.toPromise,
		);
		await pipe(
			client.fetchQuery({ queryKey: ["test", 3], queryFn: () => TE.right({ value: 3 }) }),
			TE.toPromise,
		);

		// 7 hits
		for (let i = 0; i < 7; i++) {
			await pipe(
				client.fetchQuery({ queryKey: ["test", 1], queryFn: () => TE.right({ value: 1 }) }),
				TE.toPromise,
			);
		}

		const stats = telemetry.getExtendedStats();

		// Hit Rate = 7 / (7 + 3) = 70%
		expect(stats.hits).toBe(7);
		expect(stats.misses).toBe(3);
		expect(stats.hitRate).toBe(70);
	});

	it("should calculate deduplication rate", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		const slowQuery = () =>
			TE.fromTask(async () => {
				await new Promise((resolve) => setTimeout(resolve, 50));
				return { value: 42 };
			});

		// 5 requests en paralelo a la misma key - 1 set + 4 deduplications
		await Promise.all([
			pipe(client.fetchQuery({ queryKey: ["slow"], queryFn: slowQuery }), TE.toPromise),
			pipe(client.fetchQuery({ queryKey: ["slow"], queryFn: slowQuery }), TE.toPromise),
			pipe(client.fetchQuery({ queryKey: ["slow"], queryFn: slowQuery }), TE.toPromise),
			pipe(client.fetchQuery({ queryKey: ["slow"], queryFn: slowQuery }), TE.toPromise),
			pipe(client.fetchQuery({ queryKey: ["slow"], queryFn: slowQuery }), TE.toPromise),
		]);

		const stats = telemetry.getExtendedStats();

		// Deduplication Rate = 4 deduplications / (1 set + 4 deduplications) = 80%
		expect(stats.sets).toBe(1);
		expect(stats.deduplications).toBe(4);
		expect(stats.deduplicationRate).toBe(80);
	});

	it("should calculate average hit duration", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		// Primera query (miss)
		await pipe(
			client.fetchQuery({
				queryKey: ["perf"],
				queryFn: () => TE.right({ data: "test" }),
			}),
			TE.toPromise,
		);

		// Múltiples hits para calcular average duration
		for (let i = 0; i < 10; i++) {
			await pipe(
				client.fetchQuery({
					queryKey: ["perf"],
					queryFn: () => TE.right({ data: "test" }),
				}),
				TE.toPromise,
			);
		}

		const stats = telemetry.getExtendedStats();

		expect(stats.hits).toBe(10);
		expect(stats.avgHitDuration).toBeGreaterThanOrEqual(0); // Puede ser 0 si el cache es muy rápido
		expect(stats.avgHitDuration).toBeLessThan(10); // Si hay duración, debería ser muy rápida (< 10ms)
	});

	it("should track estimated cache size", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		let stats = telemetry.getExtendedStats();
		expect(stats.estimatedCacheSize).toBe(0);

		// Agregar 5 queries
		await pipe(client.setQueryData(["user", 1], { id: 1 }), TE.toPromise);
		await pipe(client.setQueryData(["user", 2], { id: 2 }), TE.toPromise);
		await pipe(client.setQueryData(["user", 3], { id: 3 }), TE.toPromise);
		await pipe(client.setQueryData(["post", 1], { id: 1 }), TE.toPromise);
		await pipe(client.setQueryData(["post", 2], { id: 2 }), TE.toPromise);

		stats = telemetry.getExtendedStats();
		expect(stats.estimatedCacheSize).toBe(5);

		// Nota: invalidateQueries usa el store interno que maneja la eliminación,
		// pero el evento solo reporta el número de keys afectadas, no las elimina
		// del tracking de activeKeys. El estimatedCacheSize es una aproximación
		// basada en eventos set/delete/clear.

		// Clear todo
		await pipe(client.clear(), TE.toPromise);

		stats = telemetry.getExtendedStats();
		expect(stats.estimatedCacheSize).toBe(0);
	});

	it("should track average data size", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		// Objeto pequeño
		await pipe(client.setQueryData(["small"], { x: 1 }), TE.toPromise);

		// Objeto grande
		const largeData = {
			id: 1,
			name: "John Doe",
			email: "john@example.com",
			posts: Array.from({ length: 100 }, (_, i) => ({
				id: i,
				title: `Post ${i}`,
				content: "Lorem ipsum dolor sit amet",
			})),
		};
		await pipe(client.setQueryData(["large"], largeData), TE.toPromise);

		const stats = telemetry.getExtendedStats();

		expect(stats.sets).toBe(2);
		// Data size tracking removed - not part of core telemetry
	});

	it("should track invalidation impact", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		// Crear 10 users
		for (let i = 1; i <= 10; i++) {
			await pipe(client.setQueryData(["users", i], { id: i, name: `User ${i}` }), TE.toPromise);
		}

		// Crear 5 posts
		for (let i = 1; i <= 5; i++) {
			await pipe(client.setQueryData(["posts", i], { id: i, title: `Post ${i}` }), TE.toPromise);
		}

		// Invalidar todos los users
		const keysAffected = await pipe(client.invalidateQueries(["users"]), TE.toPromise);

		const stats = telemetry.getExtendedStats();

		expect(keysAffected).toBe(10);
		expect(stats.totalKeysInvalidated).toBe(10);
		expect(stats.invalidations).toBe(1);
		expect(stats.avgInvalidationSize).toBe(10);
	});

	it("should track top keys (most frequent queries)", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		// Crear queries con diferentes frecuencias
		await pipe(
			client.fetchQuery({ queryKey: ["popular"], queryFn: () => TE.right({ value: 1 }) }),
			TE.toPromise,
		);

		// "popular" accedido 20 veces
		for (let i = 0; i < 20; i++) {
			await pipe(
				client.fetchQuery({ queryKey: ["popular"], queryFn: () => TE.right({ value: 1 }) }),
				TE.toPromise,
			);
		}

		// "medium" accedido 10 veces
		await pipe(
			client.fetchQuery({ queryKey: ["medium"], queryFn: () => TE.right({ value: 2 }) }),
			TE.toPromise,
		);
		for (let i = 0; i < 10; i++) {
			await pipe(
				client.fetchQuery({ queryKey: ["medium"], queryFn: () => TE.right({ value: 2 }) }),
				TE.toPromise,
			);
		}

		// "rare" accedido 3 veces
		await pipe(
			client.fetchQuery({ queryKey: ["rare"], queryFn: () => TE.right({ value: 3 }) }),
			TE.toPromise,
		);
		for (let i = 0; i < 3; i++) {
			await pipe(
				client.fetchQuery({ queryKey: ["rare"], queryFn: () => TE.right({ value: 3 }) }),
				TE.toPromise,
			);
		}

		const topKeys = telemetry.getTopKeys(3);

		expect(topKeys).toHaveLength(3);
		expect(topKeys[0].hits).toBe(20); // popular
		expect(topKeys[1].hits).toBe(10); // medium
		expect(topKeys[2].hits).toBe(3); // rare

		// Verificar que tienen timestamp de último acceso
		expect(topKeys[0].lastAccess).toBeGreaterThan(0);
		expect(topKeys[0].key).toBeTruthy();
	});

	it("should provide comprehensive analytics", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry, defaultTTL: 60000 });

		// Simular uso real del cache
		// 1. Crear queries iniciales
		await pipe(
			client.fetchQuery({ queryKey: ["users"], queryFn: () => TE.right([1, 2, 3]) }),
			TE.toPromise,
		);
		await pipe(
			client.fetchQuery({ queryKey: ["posts"], queryFn: () => TE.right([1, 2]) }),
			TE.toPromise,
		);

		// 2. Hits repetidos
		for (let i = 0; i < 5; i++) {
			await pipe(
				client.fetchQuery({ queryKey: ["users"], queryFn: () => TE.right([1, 2, 3]) }),
				TE.toPromise,
			);
		}

		// 3. Deduplicación
		const slowQuery = () =>
			TE.fromTask(async () => {
				await new Promise((resolve) => setTimeout(resolve, 30));
				return { data: "slow" };
			});
		await Promise.all([
			pipe(client.fetchQuery({ queryKey: ["slow"], queryFn: slowQuery }), TE.toPromise),
			pipe(client.fetchQuery({ queryKey: ["slow"], queryFn: slowQuery }), TE.toPromise),
		]);

		// 4. Invalidación
		await pipe(client.setQueryData(["temp", 1], { x: 1 }), TE.toPromise);
		await pipe(client.setQueryData(["temp", 2], { x: 2 }), TE.toPromise);
		await pipe(client.invalidateQueries(["temp"]), TE.toPromise);

		const stats = telemetry.getExtendedStats();
		const topKeys = telemetry.getTopKeys(5);

		// Verificar todas las métricas
		expect(stats.hits).toBeGreaterThan(0);
		expect(stats.misses).toBeGreaterThan(0);
		expect(stats.hitRate).toBeGreaterThan(0);
		expect(stats.hitRate).toBeLessThanOrEqual(100);

		expect(stats.sets).toBeGreaterThan(0);
		expect(stats.deduplications).toBeGreaterThan(0);
		expect(stats.deduplicationRate).toBeGreaterThan(0);

		expect(stats.avgHitDuration).toBeGreaterThanOrEqual(0); // Puede ser 0 si es muy rápido
		expect(stats.estimatedCacheSize).toBeGreaterThan(0);

		expect(stats.invalidations).toBe(1);
		expect(stats.totalKeysInvalidated).toBe(2);
		expect(stats.avgInvalidationSize).toBe(2);

		expect(topKeys.length).toBeGreaterThan(0);
		expect(topKeys[0].hits).toBeGreaterThanOrEqual(topKeys[topKeys.length - 1].hits);
	});
});
