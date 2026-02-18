/**
 * Copyright (C) 2025 thexpert507
 * 
 * This file is part of @oofp/core.
 * 
 * @oofp/core is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { pipe } from "@/pipe";
import * as O from "@/object";
import { describe, it, expect } from "vitest";

describe("Object", () => {
	describe("mapValues", () => {
		it("should map all values in an object", () => {
			const obj = { a: 1, b: 2, c: 3 };
			const result = pipe(
				obj,
				O.mapValues((x) => x * 2),
			);
			expect(result).toEqual({ a: 2, b: 4, c: 6 });
		});

		it("should work with empty object", () => {
			const obj = {};
			const result = pipe(
				obj,
				O.mapValues((x) => x * 2),
			);
			expect(result).toEqual({});
		});
	});

	describe("mapKeyValues", () => {
		it("should map values with access to keys", () => {
			const obj = { a: 1, b: 2, c: 3 };
			const result = pipe(
				obj,
				O.mapKeyValues((key) => (value) => `${key}:${value}`),
			);
			expect(result).toEqual({ a: "a:1", b: "b:2", c: "c:3" });
		});
	});

	describe("mapProperty", () => {
		it("should map a single property", () => {
			const obj = { a: { c: 1 }, b: 2, c: 3 };
			const result = pipe(
				obj,
				O.mapProperty(
					"a",
					O.mapProperty("c", (x) => x.toString()),
				),
			);
			expect(result).toEqual({ a: { c: "1" }, b: 2, c: 3 });
		});

		it("should preserve other properties", () => {
			const obj = { name: "john", age: 30, city: "NY" };
			const result = pipe(
				obj,
				O.mapProperty("name", (name) => name.toUpperCase()),
			);
			expect(result).toEqual({ name: "JOHN", age: 30, city: "NY" });
		});
	});

	describe("mapPropertywc", () => {
		it("should map property with context", () => {
			const obj = { name: "john", age: 30 };
			const result = pipe(
				obj,
				O.mapPropertywc("name", ({ value, ctx }) => `${value} (${ctx.age})`),
			);
			expect(result).toEqual({ name: "john (30)", age: 30 });
		});
	});

	describe("values", () => {
		it("should return array of values", () => {
			const obj = { a: 1, b: 2, c: 3 };
			const result = O.values(obj);
			expect(result).toEqual([1, 2, 3]);
		});

		it("should return empty array for empty object", () => {
			const obj = {};
			const result = O.values(obj);
			expect(result).toEqual([]);
		});
	});

	describe("keys", () => {
		it("should return array of keys", () => {
			const obj = { a: 1, b: 2, c: 3 };
			const result = O.keys(obj);
			expect(result).toEqual(["a", "b", "c"]);
		});

		it("should return empty array for empty object", () => {
			const obj = {};
			const result = O.keys(obj);
			expect(result).toEqual([]);
		});
	});

	describe("entries", () => {
		it("should return array of key-value pairs", () => {
			const obj = { a: 1, b: 2 };
			const result = O.entries(obj);
			expect(result).toEqual([
				["a", 1],
				["b", 2],
			]);
		});
	});

	describe("fromEntries", () => {
		it("should create object from entries", () => {
			const entries: [string, number][] = [
				["a", 1],
				["b", 2],
			];
			const result = O.fromEntries(entries);
			expect(result).toEqual({ a: 1, b: 2 });
		});
	});

	describe("filter", () => {
		it("should filter properties based on predicate", () => {
			const obj = { a: 1, b: 2, c: 3, d: 4 };
			const result = pipe(
				obj,
				O.filter((value) => value % 2 === 0),
			);
			expect(result).toEqual({ b: 2, d: 4 });
		});

		it("should filter with key access", () => {
			const obj = { apple: 5, banana: 3, cherry: 8 };
			const result = pipe(
				obj,
				O.filter((value, key) => key.startsWith("a") && value > 3),
			);
			expect(result).toEqual({ apple: 5 });
		});

		it("should return empty object when no matches", () => {
			const obj = { a: 1, b: 2 };
			const result = pipe(
				obj,
				O.filter((value) => value > 10),
			);
			expect(result).toEqual({});
		});
	});

	describe("pick", () => {
		it("should pick specified properties", () => {
			const obj = { a: 1, b: 2, c: 3, d: 4 };
			const result = pipe(obj, O.pick(["a", "c"]));
			expect(result).toEqual({ a: 1, c: 3 });
		});
		it("should ignore non-existent properties", () => {
			const obj = { a: 1, b: 2 };
			const result = pipe(obj, O.pick(["a", "z" as never]));
			expect(result).toEqual({ a: 1 });
		});

		it("should return empty object for empty keys array", () => {
			const obj = { a: 1, b: 2 };
			const result = pipe(obj, O.pick([]));
			expect(result).toEqual({});
		});
	});

	describe("omit", () => {
		it("should omit specified properties", () => {
			const obj = { a: 1, b: 2, c: 3, d: 4 };
			const result = pipe(obj, O.omit(["b", "d"]));
			expect(result).toEqual({ a: 1, c: 3 });
		});

		it("should ignore non-existent properties", () => {
			const obj = { a: 1, b: 2 };
			const result = pipe(obj, O.omit(["z" as never]));
			expect(result).toEqual({ a: 1, b: 2 });
		});

		it("should return empty object when omitting all properties", () => {
			const obj = { a: 1, b: 2 };
			const result = pipe(obj, O.omit(["a", "b"]));
			expect(result).toEqual({});
		});
	});

	describe("size", () => {
		it("should return number of properties", () => {
			const obj = { a: 1, b: 2, c: 3 };
			const result = O.size(obj);
			expect(result).toBe(3);
		});

		it("should return 0 for empty object", () => {
			const obj = {};
			const result = O.size(obj);
			expect(result).toBe(0);
		});
	});

	describe("isEmpty", () => {
		it("should return true for empty object", () => {
			const obj = {};
			const result = O.isEmpty(obj);
			expect(result).toBe(true);
		});

		it("should return false for non-empty object", () => {
			const obj = { a: 1 };
			const result = O.isEmpty(obj);
			expect(result).toBe(false);
		});
	});

	describe("has", () => {
		it("should return true if key exists", () => {
			const obj = { a: 1, b: undefined };
			const result = pipe(obj, O.has("a"));
			expect(result).toBe(true);
		});

		it("should return true even for undefined values", () => {
			const obj = { a: 1, b: undefined };
			const result = pipe(obj, O.has("b"));
			expect(result).toBe(true);
		});

		it("should return false if key doesn't exist", () => {
			const obj = { a: 1 };
			const result = pipe(obj, O.has("z" as never));
			expect(result).toBe(false);
		});
	});

	describe("get", () => {
		it("should return value when key exists", () => {
			const obj = { a: 1, b: 2 };
			const result = pipe(obj, O.get("a"));
			expect(result).toBe(1);
		});

		it("should return value even if it's null/undefined", () => {
			// La función get devuelve el valor tal como está, sin coerción
			expect(O.get("a")({ a: null })).toBe(null);
			expect(O.get("b")({ b: undefined })).toBe(undefined);
		});
	});

	describe("getOr", () => {
		it("should return value if key exists", () => {
			const obj = { a: 1, b: 2 };
			const result = pipe(obj, O.getOr("a", 0));
			expect(result).toBe(1);
		});

		it("should return default value if key doesn't exist", () => {
			const obj = { a: 1 };
			const result = pipe(obj, O.getOr("z" as never, 999));
			expect(result).toBe(999);
		});

		it("should return default value for null/undefined", () => {
			// La función getOr devuelve el valor por defecto cuando el valor es nullish
			expect(O.getOr("a", 999)({ a: null } as unknown as Record<"a", number>)).toBe(999);
			expect(O.getOr("b", 999)({ b: undefined } as unknown as Record<"b", number>)).toBe(999);
		});
	});

	describe("merge", () => {
		it("should merge two objects", () => {
			const obj1: Record<string, number> = { a: 1, b: 2 };
			const obj2: Record<string, number> = { c: 3, d: 4 };
			const result = pipe(obj1, O.merge(obj2));
			expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
		});

		it("should override properties in first object", () => {
			const obj1: Record<string, number> = { a: 1, b: 2 };
			const obj2: Record<string, number> = { b: 3, c: 4 };
			const result = pipe(obj1, O.merge(obj2));
			expect(result).toEqual({ a: 1, b: 3, c: 4 });
		});
	});

	describe("deepMerge", () => {
		it("should deeply merge nested objects", () => {
			const obj1: Record<string, unknown> = { a: { x: 1, y: 2 }, b: 2 };
			const obj2: Record<string, unknown> = { a: { y: 3, z: 4 }, c: 3 };
			const result = pipe(obj1, O.deepMerge(obj2));
			expect(result).toEqual({ a: { x: 1, y: 3, z: 4 }, b: 2, c: 3 });
		});

		it("should not merge arrays", () => {
			const obj1: Record<string, unknown> = { a: [1, 2] };
			const obj2: Record<string, unknown> = { a: [3, 4] };
			const result = pipe(obj1, O.deepMerge(obj2));
			expect(result).toEqual({ a: [3, 4] });
		});

		it("should handle null values", () => {
			const obj1: Record<string, unknown> = { a: { x: 1 } };
			const obj2: Record<string, unknown> = { a: null };
			const result = pipe(obj1, O.deepMerge(obj2));
			expect(result).toEqual({ a: null });
		});
	});

	describe("mapKeys", () => {
		it("should map all keys", () => {
			const obj = { a: 1, b: 2, c: 3 };
			const result = pipe(
				obj,
				O.mapKeys((key) => key.toUpperCase()),
			);
			expect(result).toEqual({ A: 1, B: 2, C: 3 });
		});

		it("should work with empty object", () => {
			const obj: Record<string, number> = {};
			const result = pipe(
				obj,
				O.mapKeys((key: string) => key.toUpperCase()),
			);
			expect(result).toEqual({});
		});
	});

	describe("reduce", () => {
		it("should reduce object to a single value", () => {
			const obj = { a: 1, b: 2, c: 3 };
			const result = pipe(
				obj,
				O.reduce((acc, value) => acc + value, 0),
			);
			expect(result).toBe(6);
		});

		it("should provide key to reducer function", () => {
			const obj = { a: 1, b: 2 };
			const result = pipe(
				obj,
				O.reduce((acc, value, key) => acc + key + value, ""),
			);
			expect(result).toBe("a1b2");
		});

		it("should return initial value for empty object", () => {
			const obj = {};
			const result = pipe(
				obj,
				O.reduce((acc, value) => acc + value, 10),
			);
			expect(result).toBe(10);
		});
	});

	describe("invert", () => {
		it("should swap keys and values", () => {
			const obj = { a: "x", b: "y", c: "z" };
			const result = O.invert(obj);
			expect(result).toEqual({ x: "a", y: "b", z: "c" });
		});

		it("should work with empty object", () => {
			const obj = {};
			const result = O.invert(obj);
			expect(result).toEqual({});
		});
	});

	describe("groupBy", () => {
		it("should group values by function result", () => {
			const obj = { a: 1, b: 2, c: 3, d: 4 };
			const result = pipe(
				obj,
				O.groupBy((value) => (value % 2 === 0 ? "even" : "odd")),
			);
			expect(result).toEqual({ odd: [1, 3], even: [2, 4] });
		});

		it("should work with string grouping", () => {
			const obj = { apple: "fruit", carrot: "vegetable", banana: "fruit" };
			const result = pipe(
				obj,
				O.groupBy((value) => value),
			);
			expect(result).toEqual({
				fruit: ["fruit", "fruit"],
				vegetable: ["vegetable"],
			});
		});
	});

	describe("every", () => {
		it("should return true if all values match predicate", () => {
			const obj = { a: 2, b: 4, c: 6 };
			const result = pipe(
				obj,
				O.every((value) => value % 2 === 0),
			);
			expect(result).toBe(true);
		});

		it("should return false if any value doesn't match", () => {
			const obj = { a: 2, b: 3, c: 6 };
			const result = pipe(
				obj,
				O.every((value) => value % 2 === 0),
			);
			expect(result).toBe(false);
		});

		it("should return true for empty object", () => {
			const obj = {};
			const result = pipe(
				obj,
				O.every((value) => value > 0),
			);
			expect(result).toBe(true);
		});

		it("should provide key to predicate", () => {
			const obj = { a: 1, b: 2 };
			const result = pipe(
				obj,
				O.every((_value, key) => key.length === 1),
			);
			expect(result).toBe(true);
		});
	});

	describe("some", () => {
		it("should return true if any value matches predicate", () => {
			const obj = { a: 1, b: 2, c: 3 };
			const result = pipe(
				obj,
				O.some((value) => value % 2 === 0),
			);
			expect(result).toBe(true);
		});

		it("should return false if no values match", () => {
			const obj = { a: 1, b: 3, c: 5 };
			const result = pipe(
				obj,
				O.some((value) => value % 2 === 0),
			);
			expect(result).toBe(false);
		});

		it("should return false for empty object", () => {
			const obj = {};
			const result = pipe(
				obj,
				O.some((value) => value > 0),
			);
			expect(result).toBe(false);
		});

		it("should provide key to predicate", () => {
			const obj = { a: 1, bb: 2 };
			const result = pipe(
				obj,
				O.some((_value, key) => key.length > 1),
			);
			expect(result).toBe(true);
		});
	});

	describe("find", () => {
		it("should return first matching entry", () => {
			const obj = { a: 1, b: 2, c: 3 };
			const result = pipe(
				obj,
				O.find((value) => value > 1),
			);
			expect(result).toEqual(["b", 2]);
		});

		it("should return undefined if no match", () => {
			const obj = { a: 1, b: 2, c: 3 };
			const result = pipe(
				obj,
				O.find((value) => value > 10),
			);
			expect(result).toBeUndefined();
		});

		it("should provide key to predicate", () => {
			const obj = { apple: 5, banana: 3 };
			const result = pipe(
				obj,
				O.find((_value, key) => key.startsWith("b")),
			);
			expect(result).toEqual(["banana", 3]);
		});

		it("should return undefined for empty object", () => {
			const obj = {};
			const result = pipe(
				obj,
				O.find((_value) => true),
			);
			expect(result).toBeUndefined();
		});
	});

	describe("fromArray", () => {
		it("should create object from array", () => {
			const array = [
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" },
			];
			const result = pipe(
				array,
				O.fromArray(
					(item) => item.id.toString(),
					(item) => item.name,
				),
			);
			expect(result).toEqual({ "1": "Alice", "2": "Bob" });
		});

		it("should work with empty array", () => {
			const array: never[] = [];
			const result = pipe(
				array,
				O.fromArray(
					() => "key",
					() => "value",
				),
			);
			expect(result).toEqual({});
		});

		it("should handle duplicate keys by keeping last value", () => {
			const array = [
				{ type: "fruit", name: "apple" },
				{ type: "fruit", name: "banana" },
			];
			const result = pipe(
				array,
				O.fromArray(
					(item) => item.type,
					(item) => item.name,
				),
			);
			expect(result).toEqual({ fruit: "banana" });
		});
	});
});
