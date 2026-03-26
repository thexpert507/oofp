import { describe, it, expect } from "vitest";
import { pipe } from "@oofp/core/pipe";
import { toLens } from "../../lib/iso.ts";
import { type Pair, pairToTuple } from "./fixtures.ts";

describe("toLens", () => {
	const lens = toLens(pairToTuple);

	it("get is the same as to", () => {
		const p: Pair = { fst: 1, snd: "x" };
		expect(lens.get(p)).toEqual([1, "x"]);
	});

	it("set reconstructs from the focus value (ignoring old whole)", () => {
		const p: Pair = { fst: 1, snd: "x" };
		const updated = lens.set([2, "y"])(p);
		expect(updated).toEqual({ fst: 2, snd: "y" });
	});

	it("satisfies Lens GetPut law", () => {
		const p: Pair = { fst: 1, snd: "x" };
		expect(lens.set(lens.get(p))(p)).toEqual(p);
	});

	it("satisfies Lens PutGet law", () => {
		const p: Pair = { fst: 1, snd: "x" };
		const a: [number, string] = [9, "z"];
		expect(lens.get(lens.set(a)(p))).toEqual(a);
	});

	it("satisfies Lens PutPut law", () => {
		const p: Pair = { fst: 1, snd: "x" };
		const a: [number, string] = [2, "y"];
		const b: [number, string] = [3, "z"];
		expect(lens.set(b)(lens.set(a)(p))).toEqual(lens.set(b)(p));
	});

	it("works in a pipe", () => {
		const lens = pipe(pairToTuple, toLens);
		const p: Pair = { fst: 1, snd: "x" };
		expect(lens.get(p)).toEqual([1, "x"]);
	});
});
