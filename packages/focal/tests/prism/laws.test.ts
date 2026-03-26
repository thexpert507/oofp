import { describe, it, expect } from "vitest";
import * as M from "@oofp/core/maybe";
import type { Maybe } from "@oofp/core/maybe";
import { _just } from "../../lib/prism.ts";
import { intPrism } from "./fixtures.ts";

describe("Manual Prism creation", () => {
	it("preview succeeds when the string is a valid integer", () => {
		expect(intPrism.preview("42")).toEqual(M.just(42));
	});

	it("preview fails when the string is not an integer", () => {
		expect(intPrism.preview("hello")).toEqual(M.nothing());
	});

	it("review constructs a string from an integer", () => {
		expect(intPrism.review(42)).toBe("42");
	});

	it("satisfies PreviewReview: preview(review(a)) ≡ Just(a)", () => {
		const a = 99;
		expect(intPrism.preview(intPrism.review(a))).toEqual(M.just(a));
	});
});

describe("Prism laws", () => {
	const justPrism = _just<number>();

	describe("PreviewReview — previewing a reviewed value yields Just(a)", () => {
		it("holds for _just", () => {
			const a = 42;
			expect(justPrism.preview(justPrism.review(a))).toEqual(M.just(a));
		});
	});

	describe("ReviewPreview — if preview succeeds, review reconstructs s", () => {
		it("holds for _just when s is Just", () => {
			const s: Maybe<number> = M.just(42);
			const previewed = justPrism.preview(s);

			expect(M.isJust(previewed)).toBe(true);
			if (M.isJust(previewed)) {
				expect(justPrism.review(previewed.value)).toEqual(s);
			}
		});

		it("preview returns Nothing when the prism does not match", () => {
			const s: Maybe<number> = M.nothing();
			expect(justPrism.preview(s)).toEqual(M.nothing());
		});
	});
});
