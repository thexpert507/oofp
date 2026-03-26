import { describe, it, expect } from "vitest";
import { pipe } from "@oofp/core/pipe";
import { each, collect, modify, set, fold } from "../../lib/traversal.ts";

describe("Pipe-friendly operations", () => {
	const t = each<number>();

	it("collect gathers all foci", () => {
		const result = pipe(t, collect([1, 2, 3]));
		expect(result).toEqual([1, 2, 3]);
	});

	it("modify transforms every focus", () => {
		const result = pipe(t, modify((n: number) => n + 10))([1, 2, 3]);
		expect(result).toEqual([11, 12, 13]);
	});

	it("set replaces every focus with a constant", () => {
		const result = pipe(t, set(0))([1, 2, 3]);
		expect(result).toEqual([0, 0, 0]);
	});

	it("fold reduces all foci", () => {
		const result = pipe(
			t,
			fold(0, (acc: number, n: number) => acc + n),
		)([1, 2, 3, 4]);
		expect(result).toBe(10);
	});

	it("fold on empty returns initial value", () => {
		const result = pipe(
			t,
			fold(0, (acc: number, n: number) => acc + n),
		)([]);
		expect(result).toBe(0);
	});
});
