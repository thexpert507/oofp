import { describe, it, expect } from "vitest";
import { celsiusToFahrenheit, stringToChars, type Pair, pairToTuple } from "./fixtures.ts";

describe("Manual Iso creation", () => {
	it("to converts Celsius to Fahrenheit", () => {
		expect(celsiusToFahrenheit.to(0)).toBe(32);
		expect(celsiusToFahrenheit.to(100)).toBe(212);
	});

	it("from converts Fahrenheit to Celsius", () => {
		expect(celsiusToFahrenheit.from(32)).toBe(0);
		expect(celsiusToFahrenheit.from(212)).toBe(100);
	});

	it("string ↔ char[] roundtrips", () => {
		expect(stringToChars.to("hello")).toEqual(["h", "e", "l", "l", "o"]);
		expect(stringToChars.from(["h", "i"])).toBe("hi");
	});
});

describe("Iso laws", () => {
	describe("RoundTrip1 — from(to(a)) ≡ a", () => {
		it("holds for celsiusToFahrenheit", () => {
			for (const c of [0, 100, -40, 37]) {
				expect(celsiusToFahrenheit.from(celsiusToFahrenheit.to(c))).toBeCloseTo(c);
			}
		});

		it("holds for stringToChars", () => {
			for (const s of ["", "hello", "a"]) {
				expect(stringToChars.from(stringToChars.to(s))).toBe(s);
			}
		});

		it("holds for pairToTuple", () => {
			const p: Pair = { fst: 1, snd: "x" };
			expect(pairToTuple.from(pairToTuple.to(p))).toEqual(p);
		});
	});

	describe("RoundTrip2 — to(from(b)) ≡ b", () => {
		it("holds for celsiusToFahrenheit", () => {
			for (const f of [32, 212, -40, 98.6]) {
				expect(celsiusToFahrenheit.to(celsiusToFahrenheit.from(f))).toBeCloseTo(f);
			}
		});

		it("holds for stringToChars", () => {
			for (const chars of [[], ["h", "i"], ["a"]]) {
				expect(stringToChars.to(stringToChars.from(chars))).toEqual(chars);
			}
		});

		it("holds for pairToTuple", () => {
			const t: [number, string] = [1, "x"];
			expect(pairToTuple.to(pairToTuple.from(t))).toEqual(t);
		});
	});
});
