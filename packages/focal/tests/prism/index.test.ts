import { describe, it, expect } from "vitest";
import * as M from "@oofp/core/maybe";
import { index } from "../../lib/prism.ts";

describe("index Prism", () => {
	const second = index<number>(1);

	it("preview succeeds when index is in bounds", () => {
		expect(second.preview([10, 20, 30])).toEqual(M.just(20));
	});

	it("preview fails when index is out of bounds", () => {
		expect(second.preview([10])).toEqual(M.nothing());
	});

	it("preview fails on empty array", () => {
		expect(second.preview([])).toEqual(M.nothing());
	});

	it("preview fails on negative index", () => {
		const neg = index<number>(-1);
		expect(neg.preview([10, 20])).toEqual(M.nothing());
	});

	it("review constructs an array with the element at the given index", () => {
		const first = index<string>(0);
		expect(first.review("hello")).toEqual(["hello"]);
	});

	it("satisfies PreviewReview", () => {
		const first = index<number>(0);
		expect(first.preview(first.review(42))).toEqual(M.just(42));
	});
});
