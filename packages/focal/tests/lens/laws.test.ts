import { pipe } from "@oofp/core/pipe";
import { describe, expect, it } from "vitest";
import { identity, make, prop } from "../../lib/lens.ts";
import { type Person, alice } from "./fixtures.ts";

describe("Manual Lens creation", () => {
	const xLens = make<{ x: number; y: number }, number>(
		(point) => point.x,
		(x) => (point) => ({ ...point, x }),
	);

	it("get extracts the focus", () => {
		expect(xLens.get({ x: 1, y: 2 })).toBe(1);
	});

	it("set replaces the focus immutably", () => {
		const point = { x: 1, y: 2 };
		const updated = pipe(point, xLens.set(10));

		expect(updated).toEqual({ x: 10, y: 2 });
		expect(point).toEqual({ x: 1, y: 2 });
	});
});

describe("Lens laws", () => {
	const nameLens = pipe(identity<Person>(), prop("name"));

	describe("GetPut — setting what you got changes nothing", () => {
		it("holds for nameLens", () => {
			const s = alice;
			const result = nameLens.set(nameLens.get(s))(s);
			expect(result).toEqual(s);
		});
	});

	describe("PutGet — getting what you set yields what you set", () => {
		it("holds for nameLens", () => {
			const s = alice;
			const a = "Bob";
			const result = nameLens.get(nameLens.set(a)(s));
			expect(result).toBe(a);
		});
	});

	describe("PutPut — setting twice is the same as setting once", () => {
		it("holds for nameLens", () => {
			const s = alice;
			const twiceSets = nameLens.set("Charlie")(nameLens.set("Bob")(s));
			const onceSets = nameLens.set("Charlie")(s);
			expect(twiceSets).toEqual(onceSets);
		});
	});
});
