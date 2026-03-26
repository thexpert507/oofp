import { describe, it, expect } from "vitest";
import { eachValue } from "../../lib/traversal.ts";

describe("eachValue — Traversal over record values", () => {
	const t = eachValue<number>();

	it("toArray returns all values", () => {
		const values = t.toArray({ a: 1, b: 2, c: 3 });
		expect(values.sort()).toEqual([1, 2, 3]);
	});

	it("toArray returns empty for empty record", () => {
		expect(t.toArray({})).toEqual([]);
	});

	it("modify transforms all values, preserving keys", () => {
		const result = t.modify((n) => n * 10)({ x: 1, y: 2 });
		expect(result).toEqual({ x: 10, y: 20 });
	});
});
