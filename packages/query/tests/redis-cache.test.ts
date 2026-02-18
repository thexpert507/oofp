import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { RedisCache } from "../lib/client/cache/redis";
import * as M from "@oofp/core/maybe";
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

describe("RedisCache", () => {
	let cache: RedisCache;

	beforeAll(async () => {
		// Crear instancia de cache con configuración de desarrollo
		cache = new RedisCache({
			host: "localhost",
			port: 6379,
			keyPrefix: "test:",
			password: "alfabc.io",
			database: 1,
		});

		// Conectar al servidor de Redis
		await cache.connect();
	});

	afterAll(async () => {
		// Desconectar del servidor de Redis
		await cache.disconnect();
	});

	beforeEach(async () => {
		// Limpiar el cache antes de cada prueba
		await cache.clear()();
	});

	it("should store and retrieve a value", async () => {
		const key = "test-key";
		const value = { name: "John", age: 30 };
		const entry = {
			value,
			tags: ["user"],
			cachedAt: Date.now(),
			ttl: 60000, // 1 minuto
		};

		// Guardar valor
		await pipe(cache.set(key, entry), TE.toPromise);

		// Recuperar valor
		const getResult = await pipe(cache.get<typeof value>(key), TE.toPromise);
		pipe(
			getResult,
			M.fold(
				() => expect.fail("Expected Just but got Nothing"),
				(data) => expect(data).toEqual(value),
			),
		);
	});

	it("should return Nothing for non-existent key", async () => {
		const result = await pipe(cache.get("non-existent-key"), TE.toPromise);
		expect(M.isNothing(result)).toBe(true);
	});

	it("should delete a value", async () => {
		const key = "delete-test";
		const entry = {
			value: "test-value",
			tags: [],
			cachedAt: Date.now(),
			ttl: 60000,
		};

		// Guardar y luego eliminar
		await pipe(cache.set(key, entry), TE.toPromise);
		await pipe(cache.delete(key), TE.toPromise);

		// Verificar que no existe
		const result = await pipe(cache.get(key), TE.toPromise);
		expect(M.isNothing(result)).toBe(true);
	});

	it("should invalidate by tags", async () => {
		// Guardar varias entradas con diferentes tags
		await pipe(
			cache.set("user:1", {
				value: { id: 1, name: "User 1" },
				tags: ["user", "active"],
				cachedAt: Date.now(),
				ttl: 60000,
			}),
			TE.toPromise,
		);

		await pipe(
			cache.set("user:2", {
				value: { id: 2, name: "User 2" },
				tags: ["user", "inactive"],
				cachedAt: Date.now(),
				ttl: 60000,
			}),
			TE.toPromise,
		);

		await pipe(
			cache.set("post:1", {
				value: { id: 1, title: "Post 1" },
				tags: ["post", "active"],
				cachedAt: Date.now(),
				ttl: 60000,
			}),
			TE.toPromise,
		);

		// Invalidar por tag "user"
		const count = await pipe(cache.invalidateByTags(["user"]), TE.toPromise);
		expect(count).toBe(2);

		// Verificar que las entradas de usuario fueron eliminadas
		const user1 = await pipe(cache.get("user:1"), TE.toPromise);
		const user2 = await pipe(cache.get("user:2"), TE.toPromise);
		expect(M.isNothing(user1)).toBe(true);
		expect(M.isNothing(user2)).toBe(true);

		// Verificar que la entrada de post sigue existiendo
		const post1 = await pipe(cache.get("post:1"), TE.toPromise);
		expect(M.isJust(post1)).toBe(true);
	});

	it("should invalidate by multiple tags", async () => {
		const entries = [
			{
				key: "item:1",
				entry: {
					value: { id: 1 },
					tags: ["tag-a", "tag-b"],
					cachedAt: Date.now(),
					ttl: 60000,
				},
			},
			{
				key: "item:2",
				entry: {
					value: { id: 2 },
					tags: ["tag-a"],
					cachedAt: Date.now(),
					ttl: 60000,
				},
			},
			{
				key: "item:3",
				entry: {
					value: { id: 3 },
					tags: ["tag-b"],
					cachedAt: Date.now(),
					ttl: 60000,
				},
			},
		];

		for (const { key, entry } of entries) {
			await pipe(cache.set(key, entry), TE.toPromise);
		}

		// Invalidar solo los que tengan ambos tags
		const count = await pipe(cache.invalidateByTags(["tag-a", "tag-b"]), TE.toPromise);
		expect(count).toBe(1);

		// Verificar resultados
		const item1 = await pipe(cache.get("item:1"), TE.toPromise);
		const item2 = await pipe(cache.get("item:2"), TE.toPromise);
		const item3 = await pipe(cache.get("item:3"), TE.toPromise);

		expect(M.isNothing(item1)).toBe(true); // Tenía ambos tags
		expect(M.isJust(item2)).toBe(true); // Solo tenía tag-a
		expect(M.isJust(item3)).toBe(true); // Solo tenía tag-b
	});

	it("should clear all entries", async () => {
		// Crear múltiples entradas
		const entries = Array.from({ length: 5 }, (_, i) => ({
			key: `item:${i}`,
			entry: {
				value: { id: i },
				tags: [],
				cachedAt: Date.now(),
				ttl: 60000,
			},
		}));

		for (const { key, entry } of entries) {
			await pipe(cache.set(key, entry), TE.toPromise);
		}

		// Limpiar todo
		await pipe(cache.clear(), TE.toPromise);

		// Verificar que todas las entradas fueron eliminadas
		for (const { key } of entries) {
			const result = await pipe(cache.get(key), TE.toPromise);
			expect(M.isNothing(result)).toBe(true);
		}
	});

	it("should respect TTL and expire entries", async () => {
		const key = "expire-test";
		const entry = {
			value: "test-value",
			tags: [],
			cachedAt: Date.now(),
			ttl: 1000, // 1 segundo
		};

		await pipe(cache.set(key, entry), TE.toPromise);

		// Esperar a que expire
		await new Promise((resolve) => setTimeout(resolve, 1500));

		// Verificar que expiró
		const result = await pipe(cache.get(key), TE.toPromise);
		expect(M.isNothing(result)).toBe(true);
	});

	it("should handle updating existing entries", async () => {
		const key = "update-test";
		const entry1 = {
			value: "original-value",
			tags: ["tag-1"],
			cachedAt: Date.now(),
			ttl: 60000,
		};

		const entry2 = {
			value: "updated-value",
			tags: ["tag-2"],
			cachedAt: Date.now(),
			ttl: 60000,
		};

		// Guardar entrada original
		await pipe(cache.set(key, entry1), TE.toPromise);

		// Actualizar con nueva entrada y nuevos tags
		await pipe(cache.set(key, entry2), TE.toPromise);

		// Verificar que el valor fue actualizado
		const result = await pipe(cache.get(key), TE.toPromise);
		pipe(
			result,
			M.fold(
				() => expect.fail("Expected Just but got Nothing"),
				(data) => expect(data).toBe("updated-value"),
			),
		);

		// Verificar que los tags antiguos fueron eliminados
		const countTag1 = await pipe(cache.invalidateByTags(["tag-1"]), TE.toPromise);
		expect(countTag1).toBe(0);

		// Verificar que los nuevos tags están presentes
		const countTag2 = await pipe(cache.invalidateByTags(["tag-2"]), TE.toPromise);
		expect(countTag2).toBe(1);
	});
});
