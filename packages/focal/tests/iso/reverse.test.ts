import { describe, it, expect } from "vitest";
import { pipe } from "@oofp/core/pipe";
import { reverse } from "../../lib/iso.ts";
import { celsiusToFahrenheit } from "./fixtures.ts";

describe("reverse", () => {
	const fahrenheitToCelsius = reverse(celsiusToFahrenheit);

	it("to of reversed is from of original", () => {
		expect(fahrenheitToCelsius.to(212)).toBe(100);
	});

	it("from of reversed is to of original", () => {
		expect(fahrenheitToCelsius.from(100)).toBe(212);
	});

	it("reverse(reverse(iso)) behaves like iso", () => {
		const backAgain = reverse(fahrenheitToCelsius);
		expect(backAgain.to(100)).toBe(celsiusToFahrenheit.to(100));
		expect(backAgain.from(212)).toBe(celsiusToFahrenheit.from(212));
	});

	it("works in a pipe", () => {
		const fahrenheitToCelsius = pipe(celsiusToFahrenheit, reverse);
		expect(fahrenheitToCelsius.to(212)).toBe(100);
	});
});
