import { describe, it, expect } from "vitest";
import * as M from "@oofp/core/maybe";
import * as E from "@oofp/core/either";
import { _right, _left } from "../../lib/prism.ts";

describe("_right Prism", () => {
	const p = _right<string, number>();

	it("preview(Right(a)) = Just(a)", () => {
		expect(p.preview(E.right(42))).toEqual(M.just(42));
	});

	it("preview(Left(e)) = Nothing", () => {
		expect(p.preview(E.left("error"))).toEqual(M.nothing());
	});

	it("review(a) = Right(a)", () => {
		expect(p.review(42)).toEqual(E.right(42));
	});

	it("satisfies PreviewReview", () => {
		expect(p.preview(p.review(42))).toEqual(M.just(42));
	});
});

describe("_left Prism", () => {
	const p = _left<string, number>();

	it("preview(Left(e)) = Just(e)", () => {
		expect(p.preview(E.left("error"))).toEqual(M.just("error"));
	});

	it("preview(Right(a)) = Nothing", () => {
		expect(p.preview(E.right(42))).toEqual(M.nothing());
	});

	it("review(e) = Left(e)", () => {
		expect(p.review("error")).toEqual(E.left("error"));
	});

	it("satisfies PreviewReview", () => {
		expect(p.preview(p.review("oops"))).toEqual(M.just("oops"));
	});
});
