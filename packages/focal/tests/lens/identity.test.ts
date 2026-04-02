import { pipe } from "@oofp/core/pipe";
import { describe, expect, it } from "vitest";
import { compose } from "../../lib/compose.ts";
import { identity, prop } from "../../lib/lens.ts";
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
		const composed = compose(ageLens)(identity<Person>());

		expect(composed.get(alice)).toBe(ageLens.get(alice));
		expect(composed.set(99)(alice)).toEqual(ageLens.set(99)(alice));
	});

	it("composing with identity on the right is a no-op", () => {
		const ageLens = pipe(identity<Person>(), prop("age"));
		const composed = compose(identity<number>())(ageLens);

		expect(composed.get(alice)).toBe(ageLens.get(alice));
		expect(composed.set(99)(alice)).toEqual(ageLens.set(99)(alice));
	});
});
