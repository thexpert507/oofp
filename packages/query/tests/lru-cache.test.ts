import { describe, expect, it, beforeEach } from "vitest";
import { LRUCache } from "../lib/utils/lru-cache";

describe("LRUCache", () => {
	let cache: LRUCache<string, string>;

	beforeEach(() => {
		cache = new LRUCache<string, string>(3);
	});

	it("should create an LRU cache with specified size", () => {
		expect(cache.max).toBe(3);
		expect(cache.size).toBe(0);
	});

	it("should store and retrieve values", () => {
		cache.set("a", "value-a");
		cache.set("b", "value-b");

		expect(cache.get("a")).toBe("value-a");
		expect(cache.get("b")).toBe("value-b");
		expect(cache.size).toBe(2);
	});

	it("should return undefined for non-existent keys", () => {
		expect(cache.get("nonexistent")).toBeUndefined();
	});

	it("should evict least recently used item when cache is full", () => {
		cache.set("a", "1");
		cache.set("b", "2");
		cache.set("c", "3");
		expect(cache.size).toBe(3);

		// Agregar un cuarto elemento debe eliminar "a" (el más antiguo)
		cache.set("d", "4");

		expect(cache.size).toBe(3);
		expect(cache.get("a")).toBeUndefined(); // "a" fue eliminado
		expect(cache.get("b")).toBe("2");
		expect(cache.get("c")).toBe("3");
		expect(cache.get("d")).toBe("4");
	});

	it("should update LRU order when getting a value", () => {
		cache.set("a", "1");
		cache.set("b", "2");
		cache.set("c", "3");

		// Acceder a "a" lo mueve al final (más reciente)
		cache.get("a");

		// Agregar "d" debería eliminar "b" (ahora el más antiguo)
		cache.set("d", "4");

		expect(cache.get("a")).toBe("1"); // "a" no debe ser eliminado
		expect(cache.get("b")).toBeUndefined(); // "b" fue eliminado
		expect(cache.get("c")).toBe("3");
		expect(cache.get("d")).toBe("4");
	});

	it("should update LRU order when setting an existing key", () => {
		cache.set("a", "1");
		cache.set("b", "2");
		cache.set("c", "3");

		// Actualizar "a" lo mueve al final
		cache.set("a", "1-updated");

		// Agregar "d" debería eliminar "b" (ahora el más antiguo)
		cache.set("d", "4");

		expect(cache.get("a")).toBe("1-updated");
		expect(cache.get("b")).toBeUndefined(); // "b" fue eliminado
		expect(cache.get("c")).toBe("3");
		expect(cache.get("d")).toBe("4");
	});

	it("should clear all entries", () => {
		cache.set("a", "1");
		cache.set("b", "2");
		cache.set("c", "3");

		expect(cache.size).toBe(3);

		cache.clear();

		expect(cache.size).toBe(0);
		expect(cache.get("a")).toBeUndefined();
		expect(cache.get("b")).toBeUndefined();
		expect(cache.get("c")).toBeUndefined();
	});

	it("should handle complex types as keys and values", () => {
		interface User {
			id: number;
			name: string;
		}

		const userCache = new LRUCache<number, User>(2);

		userCache.set(1, { id: 1, name: "Alice" });
		userCache.set(2, { id: 2, name: "Bob" });

		expect(userCache.get(1)).toEqual({ id: 1, name: "Alice" });
		expect(userCache.get(2)).toEqual({ id: 2, name: "Bob" });

		userCache.set(3, { id: 3, name: "Charlie" });

		expect(userCache.get(1)).toBeUndefined(); // Eliminado por LRU
		expect(userCache.get(2)).toEqual({ id: 2, name: "Bob" });
		expect(userCache.get(3)).toEqual({ id: 3, name: "Charlie" });
	});

	it("should maintain LRU order with alternating access patterns", () => {
		cache.set("a", "1");
		cache.set("b", "2");
		cache.set("c", "3");

		// Patrón: c -> b -> a -> d (debería eliminar c)
		cache.get("c"); // c es más reciente
		cache.get("b"); // b es más reciente que c
		cache.get("a"); // a es el más reciente
		cache.set("d", "4"); // c es eliminado

		expect(cache.get("a")).toBe("1");
		expect(cache.get("b")).toBe("2");
		expect(cache.get("c")).toBeUndefined();
		expect(cache.get("d")).toBe("4");
	});

	it("should handle single item cache correctly", () => {
		const smallCache = new LRUCache<string, string>(1);

		smallCache.set("a", "1");
		expect(smallCache.get("a")).toBe("1");
		expect(smallCache.size).toBe(1);

		smallCache.set("b", "2");
		expect(smallCache.get("a")).toBeUndefined();
		expect(smallCache.get("b")).toBe("2");
		expect(smallCache.size).toBe(1);
	});

	it("should work with object references as keys", () => {
		const objCache = new LRUCache<object, string>(3);

		const key1 = { id: 1 };
		const key2 = { id: 2 };
		const key3 = { id: 3 };

		objCache.set(key1, "value1");
		objCache.set(key2, "value2");
		objCache.set(key3, "value3");

		expect(objCache.get(key1)).toBe("value1");
		expect(objCache.get(key2)).toBe("value2");
		expect(objCache.get(key3)).toBe("value3");

		// Objeto con mismo contenido pero diferente referencia
		expect(objCache.get({ id: 1 })).toBeUndefined();
	});
});
