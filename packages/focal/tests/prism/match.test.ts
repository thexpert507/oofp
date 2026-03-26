import * as M from "@oofp/core/maybe";
import { describe, expect, it } from "vitest";
import { matchWith } from "../../lib/prism.ts";
import { type Shape, circle, rect } from "./fixtures.ts";

describe("match — discriminated union Prism", () => {
	const _circle = matchWith<Shape>()(
		"kind",
		"circle",
		(s) => s.radius,
		(r) => ({ kind: "circle", radius: r }),
	);

	const _rect = matchWith<Shape>()(
		"kind",
		"rect",
		(s) => ({ width: s.width, height: s.height }),
		(dims) => ({ kind: "rect", ...dims }),
	);

	it("preview matches the correct variant", () => {
		expect(_circle.preview(circle(5))).toEqual(M.just(5));
	});

	it("preview returns Nothing for the wrong variant", () => {
		expect(_circle.preview(rect(3, 4))).toEqual(M.nothing());
	});

	it("review constructs the correct variant", () => {
		expect(_circle.review(10)).toEqual({ kind: "circle", radius: 10 });
	});

	it("satisfies PreviewReview for _circle", () => {
		expect(_circle.preview(_circle.review(7))).toEqual(M.just(7));
	});

	it("satisfies ReviewPreview for _circle", () => {
		const s = circle(5);
		const previewed = _circle.preview(s);
		expect(M.isJust(previewed)).toBe(true);
		if (M.isJust(previewed)) {
			expect(_circle.review(previewed.value)).toEqual(s);
		}
	});

	it("_rect preview/review round-trips", () => {
		const dims = { width: 3, height: 4 };
		expect(_rect.preview(_rect.review(dims))).toEqual(M.just(dims));
	});

	it("_rect preview fails on circle", () => {
		expect(_rect.preview(circle(5))).toEqual(M.nothing());
	});
});
