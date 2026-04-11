import * as M from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";
import { describe, expect, it } from "vitest";
import { first, modify, preview, set } from "../../lib/prism.ts";

type Person = { name: string; age: number };

const isAdult = (p: Person) => p.age >= 18;

const alice: Person = { name: "Alice", age: 30 };
const bob: Person = { name: "Bob", age: 15 };
const carol: Person = { name: "Carol", age: 25 };

describe("Prism.first", () => {
	const firstAdult = first<Person>(isAdult);

	// ---------------------------------------------------------------------------
	// preview
	// ---------------------------------------------------------------------------

	it("preview returns Just the first element matching the predicate", () => {
		expect(firstAdult.preview([bob, alice, carol])).toEqual(M.just(alice));
	});

	it("preview returns Just when the first element already matches", () => {
		expect(firstAdult.preview([alice, bob])).toEqual(M.just(alice));
	});

	it("preview returns Nothing when no element matches", () => {
		expect(firstAdult.preview([bob])).toEqual(M.nothing());
	});

	it("preview returns Nothing on empty array", () => {
		expect(firstAdult.preview([])).toEqual(M.nothing());
	});

	// ---------------------------------------------------------------------------
	// review
	// ---------------------------------------------------------------------------

	it("review wraps the value in a single-element array", () => {
		expect(firstAdult.review(alice)).toEqual([alice]);
	});

	it("satisfies PreviewReview — preview(review(a)) = Just(a)", () => {
		expect(firstAdult.preview(firstAdult.review(alice))).toEqual(M.just(alice));
	});

	// ---------------------------------------------------------------------------
	// modify
	// ---------------------------------------------------------------------------

	it("modify updates only the first matching element", () => {
		const result = pipe(
			firstAdult,
			modify((p) => ({ ...p, age: p.age + 1 })),
		)([bob, alice, carol]);
		expect(result[0]).toEqual(bob); // no match — untouched
		expect(result[1]).toEqual({ name: "Alice", age: 31 }); // first match — updated
		expect(result[2]).toEqual(carol); // second match — untouched
	});

	it("modify is a no-op when no element matches", () => {
		const arr = [bob];
		const result = pipe(
			firstAdult,
			modify((p) => ({ ...p, age: 99 })),
		)(arr);
		expect(result).toBe(arr); // same reference — nothing changed
	});

	it("modify is a no-op on empty array", () => {
		const arr: Person[] = [];
		const result = pipe(firstAdult, modify((p) => ({ ...p, age: 99 })))(arr);
		expect(result).toBe(arr);
	});

	// ---------------------------------------------------------------------------
	// set
	// ---------------------------------------------------------------------------

	it("set replaces only the first matching element", () => {
		const replacement: Person = { name: "Dave", age: 40 };
		const result = pipe(firstAdult, set(replacement))([bob, alice, carol]);
		expect(result[0]).toEqual(bob);
		expect(result[1]).toEqual(replacement);
		expect(result[2]).toEqual(carol);
	});

	// ---------------------------------------------------------------------------
	// via Prism operations (pipe-friendly)
	// ---------------------------------------------------------------------------

	it("preview via pipe", () => {
		expect(pipe(firstAdult, preview([bob, alice]))).toEqual(M.just(alice));
	});

	it("preview returns Nothing via pipe when no match", () => {
		expect(pipe(firstAdult, preview([bob]))).toEqual(M.nothing());
	});
});
