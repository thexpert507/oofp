import { describe, it, expect } from "vitest";
import { each, eachValue, filtered } from "../../lib/traversal.ts";
import { leaves, sampleTree } from "./fixtures.ts";

describe("Traversal laws", () => {
	describe("each()", () => {
		const t = each<number>();
		const data = [1, 2, 3, 4, 5];

		it("Identity — modify(id)(s) ≡ s", () => {
			expect(t.modify((x) => x)(data)).toEqual(data);
		});

		it("Identity — empty array", () => {
			expect(t.modify((x) => x)([])).toEqual([]);
		});

		it("Composition — modify(f)(modify(g)(s)) ≡ modify(f∘g)(s)", () => {
			const f = (n: number) => n * 2;
			const g = (n: number) => n + 10;
			expect(t.modify(f)(t.modify(g)(data))).toEqual(
				t.modify((x) => f(g(x)))(data),
			);
		});
	});

	describe("eachValue()", () => {
		const t = eachValue<number>();
		const data = { a: 1, b: 2 };

		it("Identity", () => {
			expect(t.modify((x) => x)(data)).toEqual(data);
		});

		it("Composition", () => {
			const f = (n: number) => n + 1;
			const g = (n: number) => n * 2;
			expect(t.modify(f)(t.modify(g)(data))).toEqual(
				t.modify((x) => f(g(x)))(data),
			);
		});
	});

	describe("filtered()", () => {
		const evens = filtered<number>((n) => n % 2 === 0);
		const data = [1, 2, 3, 4];

		it("Identity", () => {
			expect(evens.modify((x) => x)(data)).toEqual(data);
		});

		it("Composition", () => {
			const f = (n: number) => n + 1;
			const g = (n: number) => n * 2;
			expect(evens.modify(f)(evens.modify(g)(data))).toEqual(
				evens.modify((x) => f(g(x)))(data),
			);
		});
	});

	describe("leaves() — custom tree traversal", () => {
		const t = leaves<number>();

		it("Identity", () => {
			expect(t.modify((x) => x)(sampleTree)).toEqual(sampleTree);
		});

		it("Composition", () => {
			const f = (n: number) => n + 1;
			const g = (n: number) => n * 2;
			expect(t.modify(f)(t.modify(g)(sampleTree))).toEqual(
				t.modify((x) => f(g(x)))(sampleTree),
			);
		});
	});
});
