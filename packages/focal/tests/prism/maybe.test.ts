import { describe, it, expect } from "vitest";
import * as M from "@oofp/core/maybe";
import { _just, _nothing } from "../../lib/prism.ts";

describe("_just Prism", () => {
	const p = _just<string>();

	it("preview(Just(a)) = Just(a)", () => {
		expect(p.preview(M.just("hello"))).toEqual(M.just("hello"));
	});

	it("preview(Nothing) = Nothing", () => {
		expect(p.preview(M.nothing())).toEqual(M.nothing());
	});

	it("review(a) = Just(a)", () => {
		expect(p.review("hello")).toEqual(M.just("hello"));
	});
});

describe("_nothing Prism", () => {
	const p = _nothing<string>();

	it("preview(Nothing) = Just(undefined)", () => {
		expect(p.preview(M.nothing())).toEqual(M.just(undefined));
	});

	it("preview(Just(a)) = Nothing", () => {
		expect(p.preview(M.just("hello"))).toEqual(M.nothing());
	});

	it("review(undefined) = Nothing", () => {
		expect(p.review(undefined)).toEqual(M.nothing());
	});
});
