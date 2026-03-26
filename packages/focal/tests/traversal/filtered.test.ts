import { describe, it, expect } from "vitest";
import { filtered } from "../../lib/traversal.ts";

describe("filtered — Traversal with a predicate", () => {
	const evens = filtered<number>((n) => n % 2 === 0);

	it("toArray returns only matching elements", () => {
		expect(evens.toArray([1, 2, 3, 4, 5])).toEqual([2, 4]);
	});

	it("toArray returns empty when nothing matches", () => {
		expect(evens.toArray([1, 3, 5])).toEqual([]);
	});

	it("modify only transforms matching elements", () => {
		const result = evens.modify((n) => n * 10)([1, 2, 3, 4, 5]);
		expect(result).toEqual([1, 20, 3, 40, 5]);
	});

	it("non-matching elements are untouched", () => {
		const result = evens.modify((n) => n * 10)([1, 3, 5]);
		expect(result).toEqual([1, 3, 5]);
	});
});
