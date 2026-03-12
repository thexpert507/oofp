/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, expect, it } from "vitest";
import { dimap, lmap, rmap } from "../lib/function.ts";

describe("Fn profunctor utilities", () => {
	it("should call the function as-is", () => {
		const log = (msg: string) => msg;
		expect(log("Hello, World!")).toBe("Hello, World!");
	});

	it("should transform input with lmap", () => {
		const log = (msg: string) => msg;
		const upperLog = lmap((msg: string) => msg.toUpperCase())(log);
		expect(upperLog("Hello, World!")).toBe("HELLO, WORLD!");
	});

	it("should transform array input with lmap", () => {
		const log = (msg: string) => msg;
		const numberLog = lmap<string, string, number[]>((numbers: number[]) => numbers.join(", "))(
			log,
		);
		expect(numberLog([1, 2, 3])).toBe("1, 2, 3");
	});

	it("should transform output with rmap", () => {
		const log = (msg: string) => msg;
		const doubleLog = rmap<string, string, string>((msg: string) => `Double: ${msg}`)(log);
		expect(doubleLog("Hello, World!")).toBe("Double: Hello, World!");
	});

	it("should compose lmap and rmap correctly", () => {
		const log = (msg: string) => msg;
		const upper = lmap<string, string, string>((msg: string) => msg.toUpperCase())(log);
		const composedLog = rmap<string, string, string>((msg: string) => `Composed: ${msg}`)(upper);
		expect(composedLog("Hello, World!")).toBe("Composed: HELLO, WORLD!");
	});

	it("should transform both input and output with dimap", () => {
		const log = (msg: string) => msg;
		const transformedLog = dimap(
			(msg: string) => msg.toUpperCase(),
			(msg: string) => `Composed: ${msg}`,
		)(log);
		expect(transformedLog("Hello, World!")).toBe("Composed: HELLO, WORLD!");
	});
});
