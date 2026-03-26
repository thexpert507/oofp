import { describe, it, expect } from "vitest";
import { pipe } from "@oofp/core/pipe";
import { prop, identity, compose } from "../../lib/lens.ts";
import { type Person, alice } from "./fixtures.ts";

describe("identity Lens", () => {
	const id = identity<Person>();

	it("get returns the whole value", () => {
		expect(id.get(alice)).toEqual(alice);
	});

	it("set replaces the whole value", () => {
		const bob: Person = { ...alice, name: "Bob" };
		expect(id.set(bob)(alice)).toEqual(bob);
	});

	it("composing with identity on the left is a no-op", () => {
		const ageLens = pipe(identity<Person>(), prop("age"));
		const composed = pipe(identity<Person>(), compose(ageLens));

		expect(composed.get(alice)).toBe(ageLens.get(alice));
		expect(composed.set(99)(alice)).toEqual(ageLens.set(99)(alice));
	});

	it("composing with identity on the right is a no-op", () => {
		const ageLens = pipe(identity<Person>(), prop("age"));
		const composed = pipe(ageLens, compose(identity<number>()));

		expect(composed.get(alice)).toBe(ageLens.get(alice));
		expect(composed.set(99)(alice)).toEqual(ageLens.set(99)(alice));
	});
});
