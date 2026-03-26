import { describe, it, expect } from "vitest";
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";
import type { Maybe } from "@oofp/core/maybe";
import type { Either } from "@oofp/core/either";
import * as E from "@oofp/core/either";
import { _just, _right, compose } from "../../lib/prism.ts";
import { identity, prop } from "../../lib/lens.ts";
import { each } from "../../lib/traversal.ts";

describe("compose (Prism + Prism)", () => {
	// Compose: Maybe<Either<string, number>> → Either<string, number> → number
	const outerPrism = _just<Either<string, number>>();
	const innerPrism = _right<string, number>();
	const composed = pipe(outerPrism, compose(innerPrism));

	it("preview succeeds when both prisms match", () => {
		const s: Maybe<Either<string, number>> = M.just(E.right(42));
		expect(composed.preview(s)).toEqual(M.just(42));
	});

	it("preview fails when outer prism fails", () => {
		const s: Maybe<Either<string, number>> = M.nothing();
		expect(composed.preview(s)).toEqual(M.nothing());
	});

	it("preview fails when inner prism fails", () => {
		const s: Maybe<Either<string, number>> = M.just(E.left("err"));
		expect(composed.preview(s)).toEqual(M.nothing());
	});

	it("review builds from inside out", () => {
		expect(composed.review(42)).toEqual(M.just(E.right(42)));
	});

	it("satisfies PreviewReview", () => {
		const a = 42;
		expect(composed.preview(composed.review(a))).toEqual(M.just(a));
	});
});

describe("Composed Prism laws", () => {
	// A deeper composition: Maybe<Maybe<number>> → Maybe<number> → number
	const outer = _just<Maybe<number>>();
	const inner = _just<number>();
	const composed = pipe(outer, compose(inner));

	it("PreviewReview holds for composed prism", () => {
		const a = 7;
		expect(composed.preview(composed.review(a))).toEqual(M.just(a));
	});

	it("ReviewPreview holds for composed prism", () => {
		const s: Maybe<Maybe<number>> = M.just(M.just(7));
		const previewed = composed.preview(s);
		expect(M.isJust(previewed)).toBe(true);
		if (M.isJust(previewed)) {
			expect(composed.review(previewed.value)).toEqual(s);
		}
	});

	it("preview fails correctly at each level", () => {
		expect(composed.preview(M.nothing())).toEqual(M.nothing());
		expect(composed.preview(M.just(M.nothing()))).toEqual(M.nothing());
	});

	it("composition is associative", () => {
		// A → B → C composed as (A→B)→C vs A→(B→C) should be equivalent
		const outermost = _just<Maybe<Maybe<number>>>();
		const middle = _just<Maybe<number>>();
		const innermost = _just<number>();

		// (outer ∘ middle) ∘ inner
		const leftAssoc = pipe(
			pipe(outermost, compose(middle)),
			compose(innermost),
		);

		// outer ∘ (middle ∘ inner)
		const rightAssoc = pipe(
			outermost,
			compose(pipe(middle, compose(innermost))),
		);

		const s: Maybe<Maybe<Maybe<number>>> = M.just(M.just(M.just(99)));

		expect(leftAssoc.preview(s)).toEqual(rightAssoc.preview(s));
		expect(leftAssoc.review(99)).toEqual(rightAssoc.review(99));
	});
});

describe("compose", () => {
	const outerPrism = _just<Either<string, number>>();
	const innerPrism = _right<string, number>();

	it("result has tag: 'Prism' when composing Prism + Prism", () => {
		const result = pipe(outerPrism, compose(innerPrism));
		expect(result.tag).toBe("Prism");
	});

	it("compose(lens) → result has tag: 'Prism'", () => {
		// Prism<Maybe<number>, number> + Lens<number, number> → Prism<Maybe<number>, number>
		const prism = _just<number>();
		const lens = identity<number>();
		const result = pipe(prism, compose(lens));
		expect(result.tag).toBe("Prism");
	});

	it("compose(lens) preview and modify work correctly", () => {
		type Obj = { value: number };
		const prism = _just<Obj>();
		const lens = pipe(identity<Obj>(), prop("value"));
		const composed = pipe(prism, compose(lens));

		expect(composed.preview(M.just({ value: 42 }))).toEqual(M.just(42));
		expect(composed.preview(M.nothing())).toEqual(M.nothing());
	});

	it("compose(traversal) → result has tag: 'Traversal'", () => {
		// Prism<Maybe<number[]>, number[]> + Traversal<number[], number> → Traversal<Maybe<number[]>, number>
		const prism = _just<number[]>();
		const traversal = each<number>();
		const result = pipe(prism, compose(traversal));
		expect(result.tag).toBe("Traversal");
	});

	it("compose(traversal) toArray and modify work correctly", () => {
		const prism = _just<number[]>();
		const traversal = each<number>();
		const composed = pipe(prism, compose(traversal));

		expect(composed.toArray(M.just([1, 2, 3]))).toEqual([1, 2, 3]);
		expect(composed.toArray(M.nothing())).toEqual([]);
		expect(composed.modify((n) => n * 2)(M.just([1, 2, 3]))).toEqual(M.just([2, 4, 6]));
		expect(composed.modify((n) => n * 2)(M.nothing())).toEqual(M.nothing());
	});
});
