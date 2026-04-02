import { pipe } from "@oofp/core/pipe";
import { describe, expect, it } from "vitest";
import { identity, modify, prop, set, view } from "../../lib/lens.ts";
import { type Company, type Person, acme, alice } from "./fixtures.ts";

describe("view / set / modify", () => {
	const ageLens = pipe(identity<Person>(), prop("age"));

	it("view — extracts the focus, works with pipe", () => {
		const result = pipe(ageLens, view(alice));
		expect(result).toBe(30);
	});

	it("set — replaces the focus, works with pipe", () => {
		const result = pipe(ageLens, set(31))(alice);
		expect(result.age).toBe(31);
	});

	it("modify — maps a function over the focus, works with pipe", () => {
		const result = pipe(
			ageLens,
			modify((n) => n + 1),
		)(alice);
		expect(result.age).toBe(31);
	});

	it("modify with identity function changes nothing (sanity check)", () => {
		const result = pipe(
			ageLens,
			modify((n) => n),
		)(alice);
		expect(result).toEqual(alice);
	});
});

describe("Deep nesting — Company → CEO → Address → Street", () => {
	const ceoStreetLens = pipe(identity<Company>(), prop("ceo"), prop("address"), prop("street"));

	it("reads 3 levels deep", () => {
		expect(ceoStreetLens.get(acme)).toBe("123 Main St");
	});

	it("writes 3 levels deep immutably", () => {
		const updated = pipe(ceoStreetLens, set("1 Infinite Loop"))(acme);
		expect(updated.ceo.address.street).toBe("1 Infinite Loop");
		expect(updated.name).toBe("Acme Corp");
		expect(updated.ceo.name).toBe("Alice");
		expect(acme.ceo.address.street).toBe("123 Main St");
	});

	it("modify modifies 3 levels deep", () => {
		const result = pipe(
			ceoStreetLens,
			modify((s) => s.toUpperCase()),
		)(acme);
		expect(result.ceo.address.street).toBe("123 MAIN ST");
	});
});
