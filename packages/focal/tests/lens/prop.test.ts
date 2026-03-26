import { describe, it, expect } from "vitest";
import { pipe } from "@oofp/core/pipe";
import { prop, identity } from "../../lib/lens.ts";
import { type Person, alice } from "./fixtures.ts";

describe("prop combinator", () => {
	const ageLens = pipe(identity<Person>(), prop("age"));

	it("focuses on the correct property", () => {
		expect(ageLens.get(alice)).toBe(30);
	});

	it("sets the property immutably", () => {
		const updated = ageLens.set(31)(alice);
		expect(updated.age).toBe(31);
		expect(updated.name).toBe("Alice");
		expect(alice.age).toBe(30);
	});

	it("satisfies GetPut", () => {
		expect(ageLens.set(ageLens.get(alice))(alice)).toEqual(alice);
	});

	it("satisfies PutGet", () => {
		expect(ageLens.get(ageLens.set(99)(alice))).toBe(99);
	});

	it("satisfies PutPut", () => {
		expect(ageLens.set(50)(ageLens.set(40)(alice))).toEqual(
			ageLens.set(50)(alice),
		);
	});
});
