import { describe, it, expect } from "vitest";
import { pipe } from "@oofp/core/pipe";
import { each, eachValue, compose } from "../../lib/traversal.ts";

describe("compose (Traversal + Traversal)", () => {
	describe("nested arrays (each ∘ each)", () => {
		const deepEach = pipe(each<number[]>(), compose(each<number>()));

		const nested = [
			[1, 2],
			[3, 4, 5],
			[6],
		];

		it("result has tag: 'Traversal'", () => {
			expect(deepEach.tag).toBe("Traversal");
		});

		it("toArray flattens all foci", () => {
			expect(deepEach.toArray(nested)).toEqual([1, 2, 3, 4, 5, 6]);
		});

		it("modify transforms every nested element", () => {
			const result = deepEach.modify((n) => n * 10)(nested);
			expect(result).toEqual([
				[10, 20],
				[30, 40, 50],
				[60],
			]);
		});

		it("toArray returns empty when outer is empty", () => {
			expect(deepEach.toArray([])).toEqual([]);
		});

		it("toArray returns empty when all inners are empty", () => {
			expect(deepEach.toArray([[], [], []])).toEqual([]);
		});

		it("Identity law holds", () => {
			expect(deepEach.modify((x) => x)(nested)).toEqual(nested);
		});

		it("Composition law holds", () => {
			const f = (n: number) => n + 1;
			const g = (n: number) => n * 2;
			expect(deepEach.modify(f)(deepEach.modify(g)(nested))).toEqual(
				deepEach.modify((x) => f(g(x)))(nested),
			);
		});
	});

	describe("array of records (each ∘ eachValue)", () => {
		const composed = pipe(
			each<Record<string, number>>(),
			compose(eachValue<number>()),
		);

		const data: Record<string, number>[] = [{ a: 1, b: 2 }, { c: 3 }];

		it("toArray collects all nested values", () => {
			const values = composed.toArray(data);
			expect(values.sort()).toEqual([1, 2, 3]);
		});

		it("modify transforms all nested values", () => {
			const result = composed.modify((n) => n * 100)(data);
			expect(result).toEqual([{ a: 100, b: 200 }, { c: 300 }]);
		});

		it("Identity law holds", () => {
			expect(composed.modify((x) => x)(data)).toEqual(data);
		});

		it("Composition law holds", () => {
			const f = (n: number) => n + 10;
			const g = (n: number) => n * 3;
			expect(composed.modify(f)(composed.modify(g)(data))).toEqual(
				composed.modify((x) => f(g(x)))(data),
			);
		});
	});
});
