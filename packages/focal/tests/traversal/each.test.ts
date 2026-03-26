import { describe, it, expect } from "vitest";
import { each } from "../../lib/traversal.ts";

describe("each — Traversal over array elements", () => {
	const t = each<number>();

	it("toArray returns all elements", () => {
		expect(t.toArray([1, 2, 3])).toEqual([1, 2, 3]);
	});

	it("toArray returns empty for empty array", () => {
		expect(t.toArray([])).toEqual([]);
	});

	it("modify maps over all elements", () => {
		expect(t.modify((n) => n * 10)([1, 2, 3])).toEqual([10, 20, 30]);
	});
});
