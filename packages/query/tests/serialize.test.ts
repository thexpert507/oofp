import { describe, expect, it } from "vitest";
import { serialize, extractTags } from "../lib/utils/serialize";

describe("serialize", () => {
	describe("primitivos", () => {
		it("serializa null", () => {
			expect(serialize(null)).toBe("null");
		});

		it("serializa strings", () => {
			expect(serialize("hello")).toBe('"hello"');
			expect(serialize("")).toBe('""');
		});

		it("serializa números", () => {
			expect(serialize(42)).toBe("42");
			expect(serialize(0)).toBe("0");
			expect(serialize(-10)).toBe("-10");
			expect(serialize(3.14)).toBe("3.14");
		});

		it("serializa booleanos", () => {
			expect(serialize(true)).toBe("true");
			expect(serialize(false)).toBe("false");
		});
	});

	describe("fechas", () => {
		it("serializa fechas en formato ISO", () => {
			const date = new Date("2025-10-31T10:30:00.000Z");
			expect(serialize(date)).toBe('"2025-10-31T10:30:00.000Z"');
		});

		it("produce el mismo resultado para la misma fecha", () => {
			const date1 = new Date("2025-01-01T00:00:00.000Z");
			const date2 = new Date("2025-01-01T00:00:00.000Z");
			expect(serialize(date1)).toBe(serialize(date2));
		});
	});

	describe("arrays", () => {
		it("serializa arrays vacíos", () => {
			expect(serialize([])).toBe("[]");
		});

		it("serializa arrays de primitivos", () => {
			expect(serialize([1, 2, 3])).toBe("[1,2,3]");
			expect(serialize(["a", "b", "c"])).toBe('["a","b","c"]');
		});

		it("serializa arrays mixtos", () => {
			expect(serialize([1, "hello", true, null])).toBe('[1,"hello",true,null]');
		});

		it("serializa arrays anidados", () => {
			expect(
				serialize([
					[1, 2],
					[3, 4],
				]),
			).toBe("[[1,2],[3,4]]");
		});

		it("el orden de los arrays se mantiene", () => {
			expect(serialize([3, 1, 2])).toBe("[3,1,2]");
			expect(serialize([3, 1, 2])).not.toBe("[1,2,3]");
		});
	});

	describe("objetos", () => {
		it("serializa objetos vacíos", () => {
			expect(serialize({})).toBe("{}");
		});

		it("serializa objetos simples", () => {
			expect(serialize({ name: "John", age: 30 })).toBe('{"age":30,"name":"John"}');
		});

		it("ordena las claves alfabéticamente (determinismo)", () => {
			const obj1 = { b: 2, a: 1, c: 3 };
			const obj2 = { c: 3, a: 1, b: 2 };
			const obj3 = { a: 1, b: 2, c: 3 };

			const result1 = serialize(obj1);
			const result2 = serialize(obj2);
			const result3 = serialize(obj3);

			expect(result1).toBe(result2);
			expect(result2).toBe(result3);
			expect(result1).toBe('{"a":1,"b":2,"c":3}');
		});

		it("serializa objetos anidados", () => {
			const obj = {
				user: {
					name: "John",
					address: {
						city: "NYC",
						zip: 10001,
					},
				},
			};
			expect(serialize(obj)).toBe('{"user":{"address":{"city":"NYC","zip":10001},"name":"John"}}');
		});

		it("mantiene el determinismo con objetos anidados desordenados", () => {
			const obj1 = {
				z: { b: 2, a: 1 },
				a: { y: 2, x: 1 },
			};
			const obj2 = {
				a: { x: 1, y: 2 },
				z: { a: 1, b: 2 },
			};

			expect(serialize(obj1)).toBe(serialize(obj2));
		});
	});

	describe("estructuras complejas", () => {
		it("serializa arrays de objetos", () => {
			const data = [
				{ id: 2, name: "Bob" },
				{ id: 1, name: "Alice" },
			];
			expect(serialize(data)).toBe('[{"id":2,"name":"Bob"},{"id":1,"name":"Alice"}]');
		});

		it("serializa objetos con arrays", () => {
			const data = {
				users: ["Alice", "Bob"],
				count: 2,
			};
			expect(serialize(data)).toBe('{"count":2,"users":["Alice","Bob"]}');
		});

		it("serializa datos mixtos complejos", () => {
			const data = {
				string: "hello",
				number: 42,
				boolean: true,
				null: null,
				date: new Date("2025-01-01T00:00:00.000Z"),
				array: [1, 2, 3],
				nested: {
					deep: {
						value: "test",
					},
				},
			};

			const result = serialize(data);
			expect(result).toContain('"string":"hello"');
			expect(result).toContain('"number":42');
			expect(result).toContain('"boolean":true');
			expect(result).toContain('"null":null');
			expect(result).toContain('"date":"2025-01-01T00:00:00.000Z"');
		});
	});

	describe("casos de uso para cache", () => {
		it("genera la misma clave para queries equivalentes", () => {
			const query1 = { endpoint: "/users", params: { limit: 10, offset: 0 } };
			const query2 = { params: { offset: 0, limit: 10 }, endpoint: "/users" };

			expect(serialize(query1)).toBe(serialize(query2));
		});

		it("genera claves diferentes para queries distintas", () => {
			const query1 = { endpoint: "/users", params: { limit: 10 } };
			const query2 = { endpoint: "/users", params: { limit: 20 } };

			expect(serialize(query1)).not.toBe(serialize(query2));
		});

		it("puede usarse como identificador único", () => {
			const data = { userId: 123, action: "fetch" };
			const key = serialize(data);

			expect(key).toBe('{"action":"fetch","userId":123}');
			expect(typeof key).toBe("string");
		});
	});
});

describe("extractTags", () => {
	it("should return empty array for primitives", () => {
		expect(extractTags("string")).toEqual([]);
		expect(extractTags(123)).toEqual([]);
		expect(extractTags(true)).toEqual([]);
		expect(extractTags(null)).toEqual([]);
	});

	it("should return empty array for dates", () => {
		expect(extractTags(new Date("2025-01-01"))).toEqual([]);
	});

	it("should extract tags from simple arrays", () => {
		const tags = extractTags([1, 2, "hello"]);
		expect(tags).toContain("[0]:1");
		expect(tags).toContain("[1]:2");
		expect(tags).toContain("[2]:hello");
	});

	it("should extract tags from simple objects", () => {
		const tags = extractTags({ status: "active", page: 1 });
		expect(tags).toContain("status:active");
		expect(tags).toContain("page:1");
	});

	it("should extract tags from nested objects", () => {
		const tags = extractTags({
			user: {
				id: 123,
				name: "John",
			},
		});

		expect(tags).toContain("user.id:123");
		expect(tags).toContain("user.name:John");
	});

	it("should extract tags from complex nested structures", () => {
		const queryKey = ["users", { status: "active", page: 1 }];
		const tags = extractTags(queryKey);

		expect(tags).toContain("[0]:users");
		expect(tags).toContain("[1].status:active");
		expect(tags).toContain("[1].page:1");
	});

	it("should extract tags from deeply nested queryKeys", () => {
		const queryKey = [
			"posts",
			{
				filter: { status: "published", category: "tech" },
				pagination: { page: 1, limit: 10 },
			},
		];
		const tags = extractTags(queryKey);

		expect(tags).toContain("[0]:posts");
		expect(tags).toContain("[1].filter.status:published");
		expect(tags).toContain("[1].filter.category:tech");
		expect(tags).toContain("[1].pagination.page:1");
		expect(tags).toContain("[1].pagination.limit:10");
	});

	it("should extract tags from arrays within objects", () => {
		const tags = extractTags({
			ids: [1, 2, 3],
			status: "active",
		});

		expect(tags).toContain("status:active");
		expect(tags).toContain("ids[0]:1");
		expect(tags).toContain("ids[1]:2");
		expect(tags).toContain("ids[2]:3");
	});

	it("should handle null values in objects", () => {
		const tags = extractTags({ id: 1, name: null });
		expect(tags).toContain("id:1");
		expect(tags).toContain("name:null");
	});

	it("should handle boolean values in objects", () => {
		const tags = extractTags({ active: true, deleted: false });
		expect(tags).toContain("active:true");
		expect(tags).toContain("deleted:false");
	});

	it("should extract tags from dates in objects", () => {
		const date = new Date("2025-01-01T00:00:00.000Z");
		const tags = extractTags({ createdAt: date, status: "active" });

		expect(tags).toContain("createdAt:2025-01-01T00:00:00.000Z");
		expect(tags).toContain("status:active");
	});

	it("should work with real world queryKey examples", () => {
		// Ejemplo 1: Lista de usuarios con filtros
		const userListKey = ["users", { status: "active", role: "admin" }];
		const userTags = extractTags(userListKey);

		expect(userTags).toContain("[0]:users");
		expect(userTags).toContain("[1].status:active");
		expect(userTags).toContain("[1].role:admin");

		// Ejemplo 2: Detalle de usuario
		const userDetailKey = ["users", 123];
		const detailTags = extractTags(userDetailKey);

		expect(detailTags).toContain("[0]:users");
		expect(detailTags).toContain("[1]:123");

		// Ejemplo 3: Posts con paginación
		const postsKey = ["posts", { page: 1, limit: 20, category: "tech" }];
		const postsTags = extractTags(postsKey);

		expect(postsTags).toContain("[0]:posts");
		expect(postsTags).toContain("[1].page:1");
		expect(postsTags).toContain("[1].limit:20");
		expect(postsTags).toContain("[1].category:tech");
	});
});
