import { pipe } from "@oofp/core/pipe";
import { describe, expect, it } from "vitest";
import * as IsoModule from "../../lib/iso.ts";
import { celsiusToFahrenheit, fahrenheitToRankine } from "./fixtures.ts";

describe("Iso.compose (Iso + Iso = Iso)", () => {
	const celsiusToRankine = pipe(celsiusToFahrenheit, IsoModule.compose(fahrenheitToRankine));

	it("to chains both conversions", () => {
		// 0C = 32F = 491.67R
		expect(celsiusToRankine.to(0)).toBeCloseTo(491.67);
	});

	it("from chains both conversions in reverse", () => {
		expect(celsiusToRankine.from(491.67)).toBeCloseTo(0);
	});

	it("satisfies RoundTrip1", () => {
		for (const c of [0, 100, -40]) {
			expect(celsiusToRankine.from(celsiusToRankine.to(c))).toBeCloseTo(c);
		}
	});

	it("satisfies RoundTrip2", () => {
		for (const r of [491.67, 671.67, 380.07]) {
			expect(celsiusToRankine.to(celsiusToRankine.from(r))).toBeCloseTo(r);
		}
	});
});

describe("Composition associativity", () => {
	const double = IsoModule.make<number, number>(
		(n) => n * 2,
		(n) => n / 2,
	);

	const addTen = IsoModule.make<number, number>(
		(n) => n + 10,
		(n) => n - 10,
	);

	const negate = IsoModule.make<number, number>(
		(n) => -n,
		(n) => -n,
	);

	const leftAssoc = pipe(pipe(double, IsoModule.compose(addTen)), IsoModule.compose(negate));
	const rightAssoc = pipe(double, IsoModule.compose(pipe(addTen, IsoModule.compose(negate))));

	it("to produces the same result regardless of grouping", () => {
		for (const n of [0, 1, 5, -3]) {
			expect(leftAssoc.to(n)).toBe(rightAssoc.to(n));
		}
	});

	it("from produces the same result regardless of grouping", () => {
		for (const n of [0, 1, 5, -3]) {
			expect(leftAssoc.from(n)).toBe(rightAssoc.from(n));
		}
	});
});
