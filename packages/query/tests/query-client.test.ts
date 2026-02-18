import { describe, expect, it, beforeEach, afterAll, beforeAll } from "vitest";
import { createQueryClient, QueryClient, RedisCache } from "../lib";
import { QueryClientImpl } from "../lib/client/query-client-impl";
import { InMemoryTelemetryCollector } from "../lib/core/telemetry-collector";
import * as TE from "@oofp/core/task-either";
import * as M from "@oofp/core/maybe";
import * as L from "@oofp/core/list";
import { pipe } from "@oofp/core/pipe";

describe("QueryClient", () => {
	let client: QueryClient;
	let cache: RedisCache;

	beforeAll(async () => {
		cache = new RedisCache({
			host: "localhost",
			port: 6379,
			password: "alfabc.io",
		});
		await cache.connect();
	});

	beforeEach(() => {
		client = createQueryClient({ cache });
	});

	afterAll(async () => {
		// Desconectar del servidor de Redis
		await cache.disconnect();
	});

	beforeEach(async () => {
		// Limpiar el cache antes de cada prueba
		await cache.clear()();
	});

	it("should create a query client instance", () => {
		expect(client).toBeDefined();
		expect(client.fetchQuery).toBeDefined();
		expect(client.getQueryData).toBeDefined();
	});

	it("should fetch data successfully", async () => {
		const mockData = { id: 1, name: "John" };

		const result = await pipe(
			client.fetchQuery({
				queryKey: ["users"],
				queryFn: () => TE.right(mockData),
			}),
			TE.toPromise,
		);

		expect(result.cached).toBe(false);
		expect(result.data).toEqual(mockData);
	});

	it("should return cached data on second fetch", async () => {
		const queryKey = ["posts", 1];
		const mockData = { id: 1, title: "Test Post" };

		// Primera llamada
		const result1 = await pipe(
			client.fetchQuery({ queryKey, queryFn: () => TE.right(mockData) }),
			TE.toPromise,
		);

		// Segunda llamada - debería usar cache
		const result2 = await pipe(
			client.fetchQuery({ queryKey, queryFn: () => TE.right({ id: 2, title: "Different" }) }),
			TE.toPromise,
		);

		expect(result1.data).toEqual(mockData);
		expect(result1.cached).toBe(false);
		expect(result2.data).toEqual(mockData);
		expect(result2.cached).toBe(true);
	});

	it("should set and get query data manually", async () => {
		const queryKey = ["manual-data"];
		const data = { value: 42 };

		await pipe(client.setQueryData(queryKey, data), TE.toPromise);
		const result = await pipe(client.getQueryData<typeof data>(queryKey), TE.toPromise);

		pipe(
			result,
			M.fold(
				() => expect.fail("Expected Just but got Nothing"),
				(value) => expect(value).toEqual(data),
			),
		);
	});

	it("should invalidate queries and return cached data as none", async () => {
		const queryKey = ["to-invalidate"];
		const data = { test: true };

		await pipe(client.setQueryData(queryKey, data), TE.toPromise);

		// Verificar que existe
		const beforeResult = await pipe(client.getQueryData<typeof data>(queryKey), TE.toPromise);

		pipe(
			beforeResult,
			M.fold(
				() => expect.fail("Expected Just but got Nothing"),
				() => expect(true).toBe(true),
			),
		);

		// Invalidar
		const invalidatedResult = await pipe(client.invalidateQueries(queryKey), TE.toPromise);
		expect(invalidatedResult).toBeGreaterThan(0);

		// Verificar que ya no existe
		const afterResult = await pipe(client.getQueryData<typeof data>(queryKey), TE.toPromise);

		pipe(
			afterResult,
			M.fold(
				() => expect(true).toBe(true),
				() => expect.fail("Expected Nothing after invalidation"),
			),
		);
	});

	it("should invalidate multiple queries with partial pattern", async () => {
		// Guardar múltiples queries con el mismo prefijo
		await pipe(client.setQueryData(["users", 1], { id: 1, name: "John" }), TE.toPromise);
		await pipe(client.setQueryData(["users", 2], { id: 2, name: "Jane" }), TE.toPromise);
		await pipe(client.setQueryData(["posts", 1], { id: 1, title: "Post 1" }), TE.toPromise);

		// Verificar que todas existen
		const user1Before = await pipe(client.getQueryData(["users", 1]), TE.toPromise);
		const user2Before = await pipe(client.getQueryData(["users", 2]), TE.toPromise);
		const post1Before = await pipe(client.getQueryData(["posts", 1]), TE.toPromise);

		expect(M.isJust(user1Before)).toBe(true);
		expect(M.isJust(user2Before)).toBe(true);
		expect(M.isJust(post1Before)).toBe(true);

		// Invalidar solo las queries de "users"
		const invalidatedCount = await pipe(client.invalidateQueries(["users"]), TE.toPromise);
		expect(invalidatedCount).toBe(2); // Debe invalidar 2 queries

		// Verificar que users fueron invalidados pero posts no
		const user1After = await pipe(client.getQueryData(["users", 1]), TE.toPromise);
		const user2After = await pipe(client.getQueryData(["users", 2]), TE.toPromise);
		const post1After = await pipe(client.getQueryData(["posts", 1]), TE.toPromise);

		expect(M.isJust(user1After)).toBe(false);
		expect(M.isJust(user2After)).toBe(false);
		expect(M.isJust(post1After)).toBe(true); // posts NO debe ser invalidado
	});

	it("should invalidate specific query without affecting others", async () => {
		await pipe(client.setQueryData(["users", 1], { id: 1, name: "John" }), TE.toPromise);
		await pipe(client.setQueryData(["users", 2], { id: 2, name: "Jane" }), TE.toPromise);

		// Invalidar solo users/1
		const invalidatedCount = await pipe(client.invalidateQueries(["users", 1]), TE.toPromise);
		expect(invalidatedCount).toBe(1);

		// Verificar que solo users/1 fue invalidado
		const user1 = await pipe(client.getQueryData(["users", 1]), TE.toPromise);
		const user2 = await pipe(client.getQueryData(["users", 2]), TE.toPromise);

		expect(M.isJust(user1)).toBe(false);
		expect(M.isJust(user2)).toBe(true);
	});

	it("should handle invalidation with complex queryKeys", async () => {
		const complexKey1 = ["users", { status: "active", page: 1 }];
		const complexKey2 = ["users", { status: "active", page: 2 }];
		const complexKey3 = ["users", { status: "inactive", page: 1 }];

		await pipe(client.setQueryData(complexKey1, [{ id: 1 }]), TE.toPromise);
		await pipe(client.setQueryData(complexKey2, [{ id: 2 }]), TE.toPromise);
		await pipe(client.setQueryData(complexKey3, [{ id: 3 }]), TE.toPromise);

		// Invalidar por patrón parcial (status: active)
		const invalidatedCount = await pipe(
			client.invalidateQueries(["users", { status: "active" }]),
			TE.toPromise,
		);

		expect(invalidatedCount).toBe(2); // Solo las dos con status: active

		// Verificar resultados
		const result1 = await pipe(client.getQueryData(complexKey1), TE.toPromise);
		const result2 = await pipe(client.getQueryData(complexKey2), TE.toPromise);
		const result3 = await pipe(client.getQueryData(complexKey3), TE.toPromise);

		expect(M.isJust(result1)).toBe(false);
		expect(M.isJust(result2)).toBe(false);
		expect(M.isJust(result3)).toBe(true); // inactive no debe ser invalidado
	});

	it("should expire cached data after TTL", async () => {
		const queryKey = ["expiring-data"];
		const data = { value: "expires soon" };
		const ttl = 100; // 100ms

		// Guardar con TTL corto
		await pipe(client.setQueryData(queryKey, data, ttl), TE.toPromise);

		// Verificar que existe inmediatamente
		const immediate = await pipe(client.getQueryData(queryKey), TE.toPromise);
		expect(M.isJust(immediate)).toBe(true);

		// Esperar que expire
		await new Promise((resolve) => setTimeout(resolve, 150));

		// Verificar que ya no está en cache
		const expired = await pipe(client.getQueryData(queryKey), TE.toPromise);
		expect(M.isJust(expired)).toBe(false);
	});

	it("should track cache statistics correctly", async () => {
		const telemetry = new InMemoryTelemetryCollector();
		const client2 = new QueryClientImpl({ telemetry });
		let callCount = 0;

		// Primera llamada - miss
		await pipe(
			client2.fetchQuery({
				queryKey: ["stats-test", 1],
				queryFn: () => {
					callCount++;
					return TE.right({ data: "first" });
				},
			}),
			TE.toPromise,
		);

		// Segunda llamada misma key - hit
		await pipe(
			client2.fetchQuery({
				queryKey: ["stats-test", 1],
				queryFn: () => TE.right({ data: "second" }),
			}),
			TE.toPromise,
		);

		// Tercera llamada otra key - miss
		await pipe(
			client2.fetchQuery({
				queryKey: ["stats-test", 2],
				queryFn: () => {
					callCount++;
					return TE.right({ data: "third" });
				},
			}),
			TE.toPromise,
		);

		// Cuarta llamada key 2 - hit
		await pipe(
			client2.fetchQuery({
				queryKey: ["stats-test", 2],
				queryFn: () => TE.right({ data: "fourth" }),
			}),
			TE.toPromise,
		);

		const stats = telemetry.getStats();
		expect(stats.hits).toBe(2);
		expect(stats.misses).toBe(2);
		expect(stats.hitRate).toBe(50);
		expect(callCount).toBe(2); // Solo debe ejecutar queryFn 2 veces
	});

	it("should retry failed queries", async () => {
		let attempts = 0;

		const result = await pipe(
			client.fetchQuery({
				queryKey: ["retry-test"],
				queryFn: () => {
					return TE.fromTask(async () => {
						attempts++;
						if (attempts < 3) {
							throw new Error("Simulated failure");
						}
						return { success: true, attempts };
					});
				},
				retry: 3,
				retryDelay: 10,
			}),
			TE.toPromise,
		);

		expect(attempts).toBe(3);
		expect(result.data).toEqual({ success: true, attempts: 3 });
	});

	it("should not execute query when enabled is false", async () => {
		let executed = false;

		const result = await pipe(
			client.fetchQuery({
				queryKey: ["disabled-query"],
				queryFn: () => {
					executed = true;
					return TE.right({ data: "should not run" });
				},
				enabled: false,
			}),
			TE.fold(
				(error) => error,
				() => null,
			),
		)();

		expect(executed).toBe(false);
		expect(result).toBeInstanceOf(Error);
		expect((result as Error).message).toBe("Query is disabled");
	});

	it("should handle invalidation with empty tags (exact match)", async () => {
		await pipe(client.setQueryData("simple-string-key", { data: "test" }), TE.toPromise);

		// Verificar que existe
		const before = await pipe(client.getQueryData("simple-string-key"), TE.toPromise);
		expect(M.isJust(before)).toBe(true);

		// Invalidar con la key exacta
		const count = await pipe(client.invalidateQueries("simple-string-key"), TE.toPromise);
		expect(count).toBe(1);

		// Verificar que fue eliminado
		const after = await pipe(client.getQueryData("simple-string-key"), TE.toPromise);
		expect(M.isJust(after)).toBe(false);
	});

	it("should return correct age for cached data", async () => {
		const queryKey = ["age-test"];
		await pipe(client.setQueryData(queryKey, { value: 1 }), TE.toPromise);

		// Esperar un poco
		await new Promise((resolve) => setTimeout(resolve, 100));

		const result = await pipe(
			client.fetchQuery({
				queryKey,
				queryFn: () => TE.right({ value: 2 }),
			}),
			TE.toPromise,
		);

		expect(result.cached).toBe(true);
		expect(result.age).toBeGreaterThan(90);
		expect(result.age).toBeLessThan(200);
		expect(result.data).toEqual({ value: 1 }); // Debe retornar datos cacheados
	});

	describe("concurrency", () => {
		it("should deduplicate concurrent requests to same query (executes queryFn only once)", async () => {
			let executionCount = 0;
			const queryKey = ["concurrent-test"];

			const queryFn = () =>
				TE.fromTask(async () => {
					executionCount++;
					// Simular operación async lenta
					await new Promise((resolve) => setTimeout(resolve, 100));
					return { id: 1, data: "result", executionNumber: executionCount };
				});

			// Lanzar 5 requests simultáneos con la misma key
			const results = await pipe(
				Array.from({ length: 5 }),
				L.map(() => client.fetchQuery({ queryKey, queryFn })),
				TE.concurrency(),
				TE.toPromise,
			);

			// Todos deberían retornar el mismo resultado
			expect(results).toHaveLength(5);
			results.forEach((result) => {
				expect(result.data).toEqual({ id: 1, data: "result", executionNumber: 1 });
				expect(result.cached).toBe(false); // Primera ejecución, no cacheado aún
			});

			// Con deduplicación, queryFn debe ejecutarse solo UNA vez
			expect(executionCount).toBe(1);
		});

		it("should handle concurrent requests to different queries", async () => {
			let executionCount = 0;

			const createQueryFn = (id: number) =>
				TE.fromTask(async () => {
					executionCount++;
					await new Promise((resolve) => setTimeout(resolve, 30));
					return { id, data: `result-${id}` };
				});

			// Lanzar requests simultáneos con diferentes keys
			const promises = [
				pipe(
					client.fetchQuery({
						queryKey: ["concurrent", 1],
						queryFn: () => createQueryFn(1),
					}),
					TE.toPromise,
				),
				pipe(
					client.fetchQuery({
						queryKey: ["concurrent", 2],
						queryFn: () => createQueryFn(2),
					}),
					TE.toPromise,
				),
				pipe(
					client.fetchQuery({
						queryKey: ["concurrent", 3],
						queryFn: () => createQueryFn(3),
					}),
					TE.toPromise,
				),
			];

			const results = await Promise.all(promises);

			// Cada uno debería retornar su resultado específico
			expect(results[0].data).toEqual({ id: 1, data: "result-1" });
			expect(results[1].data).toEqual({ id: 2, data: "result-2" });
			expect(results[2].data).toEqual({ id: 3, data: "result-3" });

			// Se deben ejecutar todas las queries (son diferentes)
			expect(executionCount).toBe(3);
		});

		it("should serve from cache for concurrent requests after first completes", async () => {
			let executionCount = 0;
			const queryKey = ["sequential-concurrent"];

			const queryFn = () =>
				TE.fromTask(async () => {
					executionCount++;
					await new Promise((resolve) => setTimeout(resolve, 50));
					return { data: "cached-result" };
				});

			// Primera request
			await pipe(client.fetchQuery({ queryKey, queryFn }), TE.toPromise);

			// Reset del contador después de la primera ejecución
			executionCount = 0;

			// Ahora lanzar múltiples requests simultáneos
			// Todos deberían usar el cache
			const promises = Array.from({ length: 5 }, () =>
				pipe(client.fetchQuery({ queryKey, queryFn }), TE.toPromise),
			);

			const results = await Promise.all(promises);

			// Todos deben usar el cache
			results.forEach((result) => {
				expect(result.cached).toBe(true);
				expect(result.data).toEqual({ data: "cached-result" });
			});

			// No debe ejecutar queryFn (todo desde cache)
			expect(executionCount).toBe(0);
		});

		it("should handle concurrent invalidations safely", async () => {
			// Preparar múltiples queries
			await pipe(client.setQueryData(["inv-test", 1], { id: 1 }), TE.toPromise);
			await pipe(client.setQueryData(["inv-test", 2], { id: 2 }), TE.toPromise);
			await pipe(client.setQueryData(["inv-test", 3], { id: 3 }), TE.toPromise);

			// Invalidar concurrentemente
			const invalidations = [
				pipe(client.invalidateQueries(["inv-test", 1]), TE.toPromise),
				pipe(client.invalidateQueries(["inv-test", 2]), TE.toPromise),
				pipe(client.invalidateQueries(["inv-test", 3]), TE.toPromise),
			];

			const counts = await Promise.all(invalidations);

			// Cada invalidación debe eliminar 1 item
			expect(counts).toEqual([1, 1, 1]);

			// Verificar que todas fueron eliminadas
			const check1 = await pipe(client.getQueryData(["inv-test", 1]), TE.toPromise);
			const check2 = await pipe(client.getQueryData(["inv-test", 2]), TE.toPromise);
			const check3 = await pipe(client.getQueryData(["inv-test", 3]), TE.toPromise);

			expect(M.isJust(check1)).toBe(false);
			expect(M.isJust(check2)).toBe(false);
			expect(M.isJust(check3)).toBe(false);
		});

		it("should handle mixed concurrent operations (fetch, set, invalidate)", async () => {
			let fetchCount = 0;

			const queryFn = (id: number) =>
				TE.fromTask(async () => {
					fetchCount++;
					await new Promise((resolve) => setTimeout(resolve, 30));
					return { id, type: "fetched" };
				});

			// Operaciones mixtas concurrentes
			const operations = [
				// Fetches
				pipe(
					client.fetchQuery({
						queryKey: ["mixed", 1],
						queryFn: () => queryFn(1),
					}),
					TE.toPromise,
				),
				pipe(
					client.fetchQuery({
						queryKey: ["mixed", 2],
						queryFn: () => queryFn(2),
					}),
					TE.toPromise,
				),
				// Sets manuales
				pipe(client.setQueryData(["mixed", 3], { id: 3, type: "manual" }), TE.toPromise),
				// Invalidación (no debería afectar las operaciones en curso)
				pipe(client.invalidateQueries(["mixed", 99]), TE.toPromise),
			];

			await Promise.all(operations);

			// Verificar resultados
			const result1 = await pipe(client.getQueryData(["mixed", 1]), TE.toPromise);
			const result2 = await pipe(client.getQueryData(["mixed", 2]), TE.toPromise);
			const result3 = await pipe(client.getQueryData(["mixed", 3]), TE.toPromise);

			pipe(
				result1,
				M.fold(
					() => expect.fail("Expected mixed/1 to exist"),
					(data) => expect(data).toEqual({ id: 1, type: "fetched" }),
				),
			);

			pipe(
				result2,
				M.fold(
					() => expect.fail("Expected mixed/2 to exist"),
					(data) => expect(data).toEqual({ id: 2, type: "fetched" }),
				),
			);

			pipe(
				result3,
				M.fold(
					() => expect.fail("Expected mixed/3 to exist"),
					(data) => expect(data).toEqual({ id: 3, type: "manual" }),
				),
			);

			expect(fetchCount).toBe(2);
		});
	});

	describe("mutations", () => {
		it("should execute mutation and return data", async () => {
			const createUser = client.mutate({
				mutationFn: (data: { name: string }) => TE.right({ id: 1, ...data }),
			});

			const result = await pipe(createUser({ name: "John" }), TE.toPromise);

			expect(result).toEqual({ id: 1, name: "John" });
		});

		it("should invalidate queries automatically after successful mutation", async () => {
			// Guardar datos iniciales en cache
			await pipe(client.setQueryData(["users"], [{ id: 1, name: "Jane" }]), TE.toPromise);
			await pipe(client.setQueryData(["users", "stats"], { total: 1 }), TE.toPromise);

			// Verificar que existen en cache
			const before1 = await pipe(client.getQueryData(["users"]), TE.toPromise);
			const before2 = await pipe(client.getQueryData(["users", "stats"]), TE.toPromise);

			expect(M.isJust(before1)).toBe(true);
			expect(M.isJust(before2)).toBe(true);

			// Crear mutación con invalidación automática
			const createUser = client.mutate({
				mutationFn: (data: { name: string }) => TE.right({ id: 2, ...data }),
				invalidates: () => [["users"], ["users", "stats"]],
			});

			// Ejecutar mutación
			const result = await pipe(createUser({ name: "John" }), TE.toPromise);

			// Verificar que la mutación fue exitosa
			expect(result).toEqual({ id: 2, name: "John" });

			// Verificar que las queries fueron invalidadas automáticamente
			const after1 = await pipe(client.getQueryData(["users"]), TE.toPromise);
			const after2 = await pipe(client.getQueryData(["users", "stats"]), TE.toPromise);

			expect(M.isJust(after1)).toBe(false);
			expect(M.isJust(after2)).toBe(false);
		});

		it("should invalidate queries with partial patterns", async () => {
			// Guardar múltiples queries relacionadas
			await pipe(client.setQueryData(["posts", 1], { id: 1, title: "Post 1" }), TE.toPromise);
			await pipe(client.setQueryData(["posts", 2], { id: 2, title: "Post 2" }), TE.toPromise);
			await pipe(client.setQueryData(["comments"], []), TE.toPromise);

			// Crear mutación que invalida solo posts
			const updatePost = client.mutate({
				mutationFn: (id: number) => TE.right({ id, title: "Updated" }),
				invalidates: () => [["posts"]], // Invalida todos los posts
			});

			await pipe(updatePost(1), TE.toPromise);

			// Verificar que posts fueron invalidados
			const post1 = await pipe(client.getQueryData(["posts", 1]), TE.toPromise);
			const post2 = await pipe(client.getQueryData(["posts", 2]), TE.toPromise);
			const comments = await pipe(client.getQueryData(["comments"]), TE.toPromise);

			expect(M.isJust(post1)).toBe(false);
			expect(M.isJust(post2)).toBe(false);
			expect(M.isJust(comments)).toBe(true); // comments no debe ser invalidado
		});

		it("should not invalidate if mutation fails", async () => {
			// Guardar datos en cache
			await pipe(client.setQueryData(["users"], [{ id: 1 }]), TE.toPromise);

			// Verificar que existe
			const before = await pipe(client.getQueryData(["users"]), TE.toPromise);
			expect(M.isJust(before)).toBe(true);

			// Crear mutación que falla
			const failingMutation = client.mutate({
				mutationFn: () => TE.left(new Error("Mutation failed")),
				invalidates: () => [["users"]],
			});

			// Intentar ejecutar mutación (debería fallar)
			const result = await pipe(
				failingMutation(undefined),
				TE.fold(
					(error) => error,
					() => null,
				),
			)();

			expect(result).toBeInstanceOf(Error);
			expect((result as Error).message).toBe("Mutation failed");

			// Verificar que el cache NO fue invalidado
			const after = await pipe(client.getQueryData(["users"]), TE.toPromise);
			expect(M.isJust(after)).toBe(true);
		});

		it("should work without invalidates option", async () => {
			const simpleMutation = client.mutate({
				mutationFn: (x: number) => TE.right(x * 2),
			});

			const result = await pipe(simpleMutation(5), TE.toPromise);
			expect(result).toBe(10);
		});

		it("should handle multiple invalidations in parallel", async () => {
			// Guardar múltiples queries
			const keys = Array.from({ length: 10 }, (_, i) => ["item", i]);
			await Promise.all(
				keys.map((key) => pipe(client.setQueryData(key, { data: key }), TE.toPromise)),
			);

			// Verificar que todas existen
			const beforeResults = await Promise.all(
				keys.map((key) => pipe(client.getQueryData(key), TE.toPromise)),
			);
			expect(beforeResults.every(M.isJust)).toBe(true);

			// Crear mutación que invalida todas
			const bulkUpdate = client.mutate({
				mutationFn: () => TE.right({ success: true }),
				invalidates: () => keys,
			});

			await pipe(bulkUpdate(undefined), TE.toPromise);

			// Verificar que todas fueron invalidadas
			const afterResults = await Promise.all(
				keys.map((key) => pipe(client.getQueryData(key), TE.toPromise)),
			);
			expect(afterResults.every((r) => !M.isJust(r))).toBe(true);
		});
	});
});
