import { describe, it, expect } from "vitest";
import { pipe } from "@oofp/core/pipe";
import { prop, identity, compose } from "../../lib/lens.ts";
import { type Address, type Company, type Person, alice, acme } from "./fixtures.ts";

describe("compose (Lens + Lens)", () => {
	const addressLens = pipe(identity<Person>(), prop("address"));
	const streetLens = pipe(identity<Address>(), prop("street"));
	const personStreetLens = pipe(addressLens, compose(streetLens));

	it("get drills through both lenses", () => {
		expect(personStreetLens.get(alice)).toBe("123 Main St");
	});

	it("set updates deeply and immutably", () => {
		const updated = personStreetLens.set("456 Oak Ave")(alice);
		expect(updated.address.street).toBe("456 Oak Ave");
		expect(updated.address.city).toBe("Springfield");
		expect(alice.address.street).toBe("123 Main St");
	});

	it("composed lens satisfies GetPut", () => {
		const s = alice;
		expect(personStreetLens.set(personStreetLens.get(s))(s)).toEqual(s);
	});

	it("composed lens satisfies PutGet", () => {
		const a = "789 Elm Rd";
		expect(personStreetLens.get(personStreetLens.set(a)(alice))).toBe(a);
	});

	it("composed lens satisfies PutPut", () => {
		expect(
			personStreetLens.set("B")(personStreetLens.set("A")(alice)),
		).toEqual(personStreetLens.set("B")(alice));
	});
});

describe("Composition associativity", () => {
	const ceoLens = pipe(identity<Company>(), prop("ceo"));
	const addressLens = pipe(identity<Person>(), prop("address"));
	const cityLens = pipe(identity<Address>(), prop("city"));

	const leftAssoc = pipe(ceoLens, compose(addressLens), compose(cityLens));
	const rightAssoc = pipe(ceoLens, compose(pipe(addressLens, compose(cityLens))));

	it("get produces the same result regardless of grouping", () => {
		expect(leftAssoc.get(acme)).toBe(rightAssoc.get(acme));
	});

	it("set produces the same result regardless of grouping", () => {
		const newCity = "Shelbyville";
		expect(leftAssoc.set(newCity)(acme)).toEqual(
			rightAssoc.set(newCity)(acme),
		);
	});
});

describe("compose", () => {
	const addressLens = pipe(identity<Person>(), prop("address"));
	const streetLens = pipe(identity<Address>(), prop("street"));
	const personStreetLens = pipe(addressLens, compose(streetLens));

	it("get drills through both lenses", () => {
		expect(personStreetLens.get(alice)).toBe("123 Main St");
	});

	it("set updates deeply and immutably", () => {
		const updated = personStreetLens.set("456 Oak Ave")(alice);
		expect(updated.address.street).toBe("456 Oak Ave");
		expect(updated.address.city).toBe("Springfield");
		expect(alice.address.street).toBe("123 Main St");
	});

	it("composed lens satisfies GetPut", () => {
		const s = alice;
		expect(personStreetLens.set(personStreetLens.get(s))(s)).toEqual(s);
	});

	it("composed lens satisfies PutGet", () => {
		const a = "789 Elm Rd";
		expect(personStreetLens.get(personStreetLens.set(a)(alice))).toBe(a);
	});

	it("composed lens satisfies PutPut", () => {
		expect(
			personStreetLens.set("B")(personStreetLens.set("A")(alice)),
		).toEqual(personStreetLens.set("B")(alice));
	});

	it("result has tag: 'Lens'", () => {
		expect(personStreetLens.tag).toBe("Lens");
	});
});
