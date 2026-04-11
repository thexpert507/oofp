import { describe, it, expect } from "vitest";
import { pipe } from "@oofp/core/pipe";
import { prop, identity } from "../../lib/lens.ts";
import { type Person, type Company, alice, acme } from "./fixtures.ts";

describe("prop combinator — single key", () => {
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

describe("prop combinator — dot-notation path", () => {
	it("gets a two-level path", () => {
		const streetLens = pipe(identity<Company>(), prop("ceo.name"));
		expect(streetLens.get(acme)).toBe("Alice");
	});

	it("gets a three-level path", () => {
		const streetLens = pipe(identity<Company>(), prop("ceo.address.street"));
		expect(streetLens.get(acme)).toBe("123 Main St");
	});

	it("sets a two-level path immutably", () => {
		const ceoNameLens = pipe(identity<Company>(), prop("ceo.name"));
		const updated = ceoNameLens.set("Bob")(acme);
		expect(updated.ceo.name).toBe("Bob");
		expect(acme.ceo.name).toBe("Alice"); // original unchanged
	});

	it("sets a three-level path immutably", () => {
		const streetLens = pipe(identity<Company>(), prop("ceo.address.street"));
		const updated = streetLens.set("456 Oak Ave")(acme);
		expect(updated.ceo.address.street).toBe("456 Oak Ave");
		expect(updated.ceo.address.city).toBe("Springfield"); // sibling unchanged
		expect(acme.ceo.address.street).toBe("123 Main St"); // original unchanged
	});

	it("satisfies GetPut for a deep path", () => {
		const cityLens = pipe(identity<Company>(), prop("ceo.address.city"));
		expect(cityLens.set(cityLens.get(acme))(acme)).toEqual(acme);
	});

	it("satisfies PutGet for a deep path", () => {
		const cityLens = pipe(identity<Company>(), prop("ceo.address.city"));
		expect(cityLens.get(cityLens.set("Boston")(acme))).toBe("Boston");
	});
});
