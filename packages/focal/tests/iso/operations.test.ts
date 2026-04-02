import { pipe } from "@oofp/core/pipe";
import { describe, expect, it } from "vitest";
import { modify, review, view } from "../../lib/iso.ts";
import { celsiusToFahrenheit, stringToChars } from "./fixtures.ts";

describe("view / review / modify (pipe-friendly)", () => {
	it("view applies the forward direction", () => {
		const result = pipe(celsiusToFahrenheit, view(100));
		expect(result).toBe(212);
	});

	it("review applies the backward direction", () => {
		const result = pipe(celsiusToFahrenheit, review(212));
		expect(result).toBe(100);
	});

	it("modify transforms in B-space and maps back to A-space", () => {
		// Double the Fahrenheit value, return as Celsius
		const result = pipe(
			celsiusToFahrenheit,
			modify((f: number) => f * 2),
		)(100);
		// 100C = 212F → 424F = (424 - 32) * 5/9 ≈ 217.78C
		expect(result).toBeCloseTo(((424 - 32) * 5) / 9);
	});

	it("modify with identity function changes nothing", () => {
		const result = pipe(
			stringToChars,
			modify((chars: string[]) => chars),
		)("hello");
		expect(result).toBe("hello");
	});

	it("modify can manipulate chars and get back a string", () => {
		const result = pipe(
			stringToChars,
			modify((chars: string[]) => chars.map((c) => c.toUpperCase())),
		)("hello");
		expect(result).toBe("HELLO");
	});
});
