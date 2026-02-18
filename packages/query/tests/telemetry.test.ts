import { describe, it, expect } from "vitest";
import { QueryClientImpl } from "@/client/query-client-impl";
import { InMemoryTelemetryCollector } from "@/core/telemetry-collector";
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

describe("Telemetry Events", () => {
	it("should record cache hit events", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		// Primera consulta - miss
		await pipe(
			client.fetchQuery({
				queryKey: ["test", 1],
				queryFn: () => TE.right({ value: 42 }),
			}),
			TE.toPromise,
		);

		// Segunda consulta - hit
		await pipe(
			client.fetchQuery({
				queryKey: ["test", 1],
				queryFn: () => TE.right({ value: 42 }),
			}),
			TE.toPromise,
		);

		const events = telemetry.getEvents();
		const hitEvents = events.filter((e) => e.type === "hit");
		const missEvents = events.filter((e) => e.type === "miss");
		const setEvents = events.filter((e) => e.type === "set");

		expect(missEvents).toHaveLength(1);
		expect(hitEvents).toHaveLength(1);
		expect(setEvents).toHaveLength(1);

		// Verificar que hit tiene duration
		expect(hitEvents[0]).toHaveProperty("duration");
		expect(typeof hitEvents[0].duration).toBe("number");
		expect(hitEvents[0].duration).toBeGreaterThanOrEqual(0);
	});

	it("should record set events with size and ttl", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry, defaultTTL: 60000 });

		await pipe(
			client.fetchQuery({
				queryKey: ["user", 123],
				queryFn: () => TE.right({ id: 123, name: "John Doe" }),
			}),
			TE.toPromise,
		);

		const events = telemetry.getEvents();
		const setEvents = events.filter((e) => e.type === "set");

		expect(setEvents).toHaveLength(1);
		expect(setEvents[0]).toMatchObject({
			type: "set",
			tags: ["[0]:user", "[1]:123"],
			ttl: 60000,
		});
	});

	it("should record invalidation events", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		// Crear varias queries
		await pipe(client.setQueryData(["users", 1], { id: 1, name: "Alice" }), TE.toPromise);
		await pipe(client.setQueryData(["users", 2], { id: 2, name: "Bob" }), TE.toPromise);
		await pipe(client.setQueryData(["posts", 1], { id: 1, title: "Hello" }), TE.toPromise);

		// Invalidar solo users
		const keysAffected = await pipe(client.invalidateQueries(["users"]), TE.toPromise);

		const events = telemetry.getEvents();
		const invalidateEvents = events.filter((e) => e.type === "invalidate");

		expect(invalidateEvents).toHaveLength(1);
		expect(invalidateEvents[0]).toMatchObject({
			type: "invalidate",
			tags: ["[0]:users"],
			keysAffected: 2,
		});
		expect(keysAffected).toBe(2);
	});

	it("should record deduplicate events", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		let callCount = 0;
		const slowQuery = () =>
			TE.fromTask(async () => {
				callCount++;
				await new Promise((resolve) => setTimeout(resolve, 100));
				return { value: 42 };
			});

		// Ejecutar 3 queries en paralelo con la misma key
		const promises = [
			pipe(client.fetchQuery({ queryKey: ["slow"], queryFn: slowQuery }), TE.toPromise),
			pipe(client.fetchQuery({ queryKey: ["slow"], queryFn: slowQuery }), TE.toPromise),
			pipe(client.fetchQuery({ queryKey: ["slow"], queryFn: slowQuery }), TE.toPromise),
		];

		await Promise.all(promises);

		const events = telemetry.getEvents();
		const deduplicateEvents = events.filter((e) => e.type === "deduplicate");

		// Debe haber 2 eventos de deduplicación (2da y 3ra llamada)
		expect(deduplicateEvents).toHaveLength(2);
		expect(deduplicateEvents[0].waiters).toBe(1);
		expect(deduplicateEvents[1].waiters).toBe(2);

		// Verificar que solo se llamó una vez al queryFn
		expect(callCount).toBe(1);
	});

	it("should record delete events", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		await pipe(client.setQueryData(["user", 1], { id: 1, name: "Alice" }), TE.toPromise);

		await pipe(client.removeQueries(["user", 1]), TE.toPromise);

		const events = telemetry.getEvents();
		// removeQueries llama a invalidate, no a delete directamente
		// invalidate elimina usando tags
		const invalidateEvents = events.filter((e) => e.type === "invalidate");

		expect(invalidateEvents).toHaveLength(1);
		expect(invalidateEvents[0]).toMatchObject({
			type: "invalidate",
			tags: ["[0]:user", "[1]:1"],
			keysAffected: 1,
		});
	});

	it("should record clear events", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		await pipe(client.setQueryData(["test"], { value: 1 }), TE.toPromise);
		await pipe(client.clear(), TE.toPromise);

		const events = telemetry.getEvents();
		const clearEvents = events.filter((e) => e.type === "clear");

		expect(clearEvents).toHaveLength(1);
		expect(clearEvents[0]).toEqual({ type: "clear" });
	});

	it("should provide extended stats", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		// Generar varios eventos
		await pipe(
			client.fetchQuery({
				queryKey: ["test", 1],
				queryFn: () => TE.right({ value: 1 }),
			}),
			TE.toPromise,
		);
		await pipe(
			client.fetchQuery({
				queryKey: ["test", 1],
				queryFn: () => TE.right({ value: 1 }),
			}),
			TE.toPromise,
		);

		await pipe(client.setQueryData(["manual"], { value: 2 }), TE.toPromise);
		await pipe(client.invalidateQueries(["test"]), TE.toPromise);
		await pipe(client.clear(), TE.toPromise);

		const extendedStats = telemetry.getExtendedStats();

		expect(extendedStats).toMatchObject({
			hits: 1,
			misses: 1,
			hitRate: 50,
			sets: 2,
			deletes: 0,
			invalidations: 1,
			deduplications: 0,
			clears: 1,
			totalKeysInvalidated: 1,
			avgInvalidationSize: 1,
		});
	});

	it("should maintain backward compatibility with getStats", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client = new QueryClientImpl({ telemetry });

		await pipe(
			client.fetchQuery({
				queryKey: ["test"],
				queryFn: () => TE.right({ value: 1 }),
			}),
			TE.toPromise,
		);
		await pipe(
			client.fetchQuery({
				queryKey: ["test"],
				queryFn: () => TE.right({ value: 1 }),
			}),
			TE.toPromise,
		);

		const stats = telemetry.getStats();

		expect(stats).toMatchObject({
			hits: 1,
			misses: 1,
			hitRate: 50,
		});
	});
});
