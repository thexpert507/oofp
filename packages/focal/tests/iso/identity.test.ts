import { describe, it, expect } from "vitest";
import { identity } from "../../lib/iso.ts";

describe("identity Iso", () => {
	const id = identity<number>();

	it("to is the identity function", () => {
		expect(id.to(42)).toBe(42);
	});

	it("from is the identity function", () => {
		expect(id.from(42)).toBe(42);
	});

	it("satisfies both roundtrip laws trivially", () => {
		expect(id.from(id.to(99))).toBe(99);
		expect(id.to(id.from(99))).toBe(99);
	});
});
