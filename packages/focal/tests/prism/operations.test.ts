import * as M from "@oofp/core/maybe";
import type { Maybe } from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";
import { describe, expect, it } from "vitest";
import { _just, modify, preview, review, set } from "../../lib/prism.ts";

describe("preview / review / set / modify (pipe-friendly)", () => {
	const p = _just<number>();

	it("preview works with pipe — prism flows through", () => {
		const result = pipe(p, preview(M.just(42)));
		expect(result).toEqual(M.just(42));
	});

	it("preview returns Nothing when focus is absent", () => {
		const result = pipe(p, preview(M.nothing()));
		expect(result).toEqual(M.nothing());
	});

	it("review works with pipe — prism flows through", () => {
		const result = pipe(p, review(42));
		expect(result).toEqual(M.just(42));
	});

	it("modify modifies the focus when present", () => {
		const result = pipe(
			p,
			modify((n: number) => n * 2),
		)(M.just(10));
		expect(result).toEqual(M.just(20));
	});

	it("modify leaves the whole unchanged when focus is absent", () => {
		const nothing: Maybe<number> = M.nothing();
		const result = pipe(
			p,
			modify((n: number) => n * 2),
		)(nothing);
		expect(result).toEqual(M.nothing());
	});

	it("set replaces the focus when present", () => {
		const result = pipe(p, set(99))(M.just(10));
		expect(result).toEqual(M.just(99));
	});

	it("set leaves the whole unchanged when focus is absent", () => {
		const nothing: Maybe<number> = M.nothing();
		const result = pipe(p, set(99))(nothing);
		expect(result).toEqual(M.nothing());
	});
});
