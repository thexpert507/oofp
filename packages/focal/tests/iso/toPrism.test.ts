import { describe, it, expect } from "vitest";
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";
import { toPrism } from "../../lib/iso.ts";
import { stringToChars } from "./fixtures.ts";

describe("toPrism", () => {
	const prism = toPrism(stringToChars);

	it("preview always succeeds (returns Just)", () => {
		expect(prism.preview("hello")).toEqual(M.just(["h", "e", "l", "l", "o"]));
	});

	it("review is the same as from", () => {
		expect(prism.review(["h", "i"])).toBe("hi");
	});

	it("satisfies Prism PreviewReview law", () => {
		const chars = ["a", "b"];
		expect(prism.preview(prism.review(chars))).toEqual(M.just(chars));
	});

	it("satisfies Prism ReviewPreview law", () => {
		const s = "hello";
		const previewed = prism.preview(s);
		expect(M.isJust(previewed)).toBe(true);
		if (M.isJust(previewed)) {
			expect(prism.review(previewed.value)).toBe(s);
		}
	});

	it("works in a pipe", () => {
		const prism = pipe(stringToChars, toPrism);
		expect(prism.preview("hi")).toEqual(M.just(["h", "i"]));
	});
});
