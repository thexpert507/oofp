/**
 * Tests for the unified compose module.
 *
 * Verifies the composition table:
 *
 *   from \ to  | Iso       | Lens      | Prism     | Traversal
 *   -----------|-----------|-----------|-----------|----------
 *   Iso        | Iso       | Lens      | Prism     | Traversal
 *   Lens       | Lens      | Lens      | Prism     | Traversal
 *   Prism      | Prism     | Prism     | Prism     | Traversal
 *   Traversal  | Traversal | Traversal | Traversal | Traversal
 *
 * Each combination is tested for:
 *   1. The tag of the result (correct optic type)
 *   2. Correct functional behaviour
 *   3. The main law of the resulting optic type
 */

import * as E from "@oofp/core/either";
import * as M from "@oofp/core/maybe";
import type { Maybe } from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";
import { describe, expect, it } from "vitest";
import { compose } from "../lib/compose.ts";
import * as Iso from "../lib/iso.ts";
import * as Lens from "../lib/lens.ts";
import * as Prism from "../lib/prism.ts";
import * as Traversal from "../lib/traversal.ts";
import { celsiusToFahrenheit, pairToTuple } from "./iso/fixtures.ts";
import { type Address, type Person, alice } from "./lens/fixtures.ts";

// ---------------------------------------------------------------------------
// Shared optics used across multiple suites
// ---------------------------------------------------------------------------

const addressLens = pipe(Lens.identity<Person>(), Lens.prop("address"));
const streetLens = pipe(Lens.identity<Address>(), Lens.prop("street"));
const justNumPrism = Prism._just<number>();
const eachNum = Traversal.each<number>();

// ---------------------------------------------------------------------------
// Iso as `from`
// ---------------------------------------------------------------------------

describe("Iso + Iso = Iso", () => {
	// celsiusToFahrenheit ∘ reverse(celsiusToFahrenheit) ≡ identity
	const roundTrip = compose(Iso.reverse(celsiusToFahrenheit))(celsiusToFahrenheit);

	it("tag is 'Iso'", () => {
		expect(roundTrip.tag).toBe("Iso");
	});

	it("to is identity", () => {
		expect(roundTrip.to(0)).toBeCloseTo(0);
		expect(roundTrip.to(100)).toBeCloseTo(100);
	});

	it("from is identity", () => {
		expect(roundTrip.from(0)).toBeCloseTo(0);
		expect(roundTrip.from(37)).toBeCloseTo(37);
	});

	it("law RoundTrip1: from(to(a)) ≡ a", () => {
		for (const n of [0, 37, -10, 100]) {
			expect(roundTrip.from(roundTrip.to(n))).toBeCloseTo(n);
		}
	});

	it("law RoundTrip2: to(from(b)) ≡ b", () => {
		for (const n of [0, 37, -10, 100]) {
			expect(roundTrip.to(roundTrip.from(n))).toBeCloseTo(n);
		}
	});
});

describe("Iso + Lens = Lens", () => {
	// pairToTuple: Pair ↔ [number, string], then get the first element
	const fstLens = Lens.make<[number, string], number>(
		([n]) => n,
		(n) =>
			([, s]) => [n, s],
	);
	const pairFst = compose(fstLens)(pairToTuple);

	it("tag is 'Lens'", () => {
		expect(pairFst.tag).toBe("Lens");
	});

	it("get extracts through the Iso", () => {
		expect(pairFst.get({ fst: 42, snd: "hello" })).toBe(42);
	});

	it("set updates through the Iso", () => {
		expect(pairFst.set(99)({ fst: 42, snd: "hello" })).toEqual({ fst: 99, snd: "hello" });
	});

	it("law GetPut: set(get(s))(s) ≡ s", () => {
		const p = { fst: 7, snd: "x" };
		expect(pairFst.set(pairFst.get(p))(p)).toEqual(p);
	});

	it("law PutGet: get(set(a)(s)) ≡ a", () => {
		expect(pairFst.get(pairFst.set(99)({ fst: 1, snd: "y" }))).toBe(99);
	});
});

describe("Iso + Prism = Prism", () => {
	// number ↔ Maybe<number>, then focus on the Just branch
	const numToMaybe = Iso.make<number, Maybe<number>>(
		(n) => (n >= 0 ? M.just(n) : M.nothing()),
		(m) => (M.isJust(m) ? m.value : -1),
	);
	const composed = compose(justNumPrism)(numToMaybe);

	it("tag is 'Prism'", () => {
		expect(composed.tag).toBe("Prism");
	});

	it("preview succeeds when Prism matches", () => {
		expect(composed.preview(5)).toEqual(M.just(5));
	});

	it("preview fails when Prism does not match", () => {
		expect(composed.preview(-1)).toEqual(M.nothing());
	});

	it("law PreviewReview: preview(review(a)) ≡ Just(a)", () => {
		expect(composed.preview(composed.review(10))).toEqual(M.just(10));
	});
});

describe("Iso + Traversal = Traversal", () => {
	// string ↔ char[], then traverse each char
	const stringToChars = Iso.make<string, string[]>(
		(s) => s.split(""),
		(cs) => cs.join(""),
	);
	const eachChar = Traversal.each<string>();
	const composed = compose(eachChar)(stringToChars);

	it("tag is 'Traversal'", () => {
		expect(composed.tag).toBe("Traversal");
	});

	it("toArray collects all foci through the Iso", () => {
		expect(composed.toArray("abc")).toEqual(["a", "b", "c"]);
	});

	it("modify transforms all foci through the Iso", () => {
		expect(composed.modify((c) => c.toUpperCase())("abc")).toBe("ABC");
	});

	it("law Identity: modify(id)(s) ≡ s", () => {
		expect(composed.modify((x) => x)("hello")).toBe("hello");
	});
});

// ---------------------------------------------------------------------------
// Lens as `from`
// ---------------------------------------------------------------------------

describe("Lens + Iso = Lens", () => {
	// Address.street (Lens) → uppercase string (Iso)
	// Note: upperIso.from(upperIso.to(s)) ≡ s only when s is already lowercase.
	// We use a purely bijective iso (reversal) for the GetPut law to avoid
	// the case-folding pitfall with mixed-case strings.
	const upperIso = Iso.make<string, string>(
		(s) => s.toUpperCase(),
		(s) => s.toLowerCase(),
	);
	const reverseIso = Iso.make<string, string>(
		(s) => s.split("").reverse().join(""),
		(s) => s.split("").reverse().join(""),
	);
	const composed = compose(upperIso)(streetLens);
	const composedReverse = compose(reverseIso)(streetLens);

	it("tag is 'Lens'", () => {
		expect(composed.tag).toBe("Lens");
	});

	it("get applies Iso.to through the Lens", () => {
		expect(composed.get(alice.address)).toBe("123 MAIN ST");
	});

	it("set applies Iso.from and writes through the Lens", () => {
		const updated = composed.set("456 OAK AVE")(alice.address);
		expect(updated.street).toBe("456 oak ave");
	});

	it("law GetPut: set(get(s))(s) ≡ s", () => {
		// Use a bijective iso (reversal is self-inverse) so the law holds.
		expect(composedReverse.set(composedReverse.get(alice.address))(alice.address)).toEqual(
			alice.address,
		);
	});
});

describe("Lens + Lens = Lens", () => {
	const composed = compose(streetLens)(addressLens);

	it("tag is 'Lens'", () => {
		expect(composed.tag).toBe("Lens");
	});

	it("get drills through both lenses", () => {
		expect(composed.get(alice)).toBe("123 Main St");
	});

	it("set updates deeply and immutably", () => {
		const updated = composed.set("456 Oak Ave")(alice);
		expect(updated.address.street).toBe("456 Oak Ave");
		expect(alice.address.street).toBe("123 Main St");
	});

	it("law GetPut: set(get(s))(s) ≡ s", () => {
		expect(composed.set(composed.get(alice))(alice)).toEqual(alice);
	});

	it("law PutGet: get(set(a)(s)) ≡ a", () => {
		const a = "789 Elm Rd";
		expect(composed.get(composed.set(a)(alice))).toBe(a);
	});

	it("law PutPut: set(b)(set(a)(s)) ≡ set(b)(s)", () => {
		expect(composed.set("B")(composed.set("A")(alice))).toEqual(composed.set("B")(alice));
	});
});

describe("Lens + Prism = Prism", () => {
	// Person → email (Lens) → string inside Just (Prism)
	type PersonWithEmail = { name: string; email: Maybe<string> };
	const emailLens = pipe(Lens.identity<PersonWithEmail>(), Lens.prop("email"));
	const justStr = Prism._just<string>();
	const composed = compose(justStr)(emailLens);

	const withEmail: PersonWithEmail = { name: "Alice", email: M.just("a@b.com") };
	const withoutEmail: PersonWithEmail = { name: "Bob", email: M.nothing() };

	it("tag is 'Prism'", () => {
		expect(composed.tag).toBe("Prism");
	});

	it("preview succeeds when Prism matches", () => {
		expect(composed.preview(withEmail)).toEqual(M.just("a@b.com"));
	});

	it("preview fails when Prism does not match", () => {
		expect(composed.preview(withoutEmail)).toEqual(M.nothing());
	});

	it("law PreviewReview: preview(review(a)) ≡ Just(a)", () => {
		expect(composed.preview(composed.review("test@test.com"))).toEqual(M.just("test@test.com"));
	});
});

describe("Lens + Traversal = Traversal", () => {
	// Person → scores (Lens) → each score (Traversal)
	type PersonWithScores = { name: string; scores: number[] };
	const scoresLens = pipe(Lens.identity<PersonWithScores>(), Lens.prop("scores"));
	const composed = compose(eachNum)(scoresLens);

	const p: PersonWithScores = { name: "Alice", scores: [85, 92, 78] };

	it("tag is 'Traversal'", () => {
		expect(composed.tag).toBe("Traversal");
	});

	it("toArray collects all foci", () => {
		expect(composed.toArray(p)).toEqual([85, 92, 78]);
	});

	it("modify transforms all foci", () => {
		expect(composed.modify((n) => n + 5)(p).scores).toEqual([90, 97, 83]);
	});

	it("law Identity: modify(id)(s) ≡ s", () => {
		expect(composed.modify((x) => x)(p)).toEqual(p);
	});

	it("law Composition: modify(f)(modify(g)(s)) ≡ modify(f∘g)(s)", () => {
		const f = (n: number) => n + 1;
		const g = (n: number) => n * 2;
		expect(composed.modify(f)(composed.modify(g)(p))).toEqual(composed.modify((x) => f(g(x)))(p));
	});
});

// ---------------------------------------------------------------------------
// Prism as `from`
// ---------------------------------------------------------------------------

describe("Prism + Iso = Prism", () => {
	// Maybe<number> → number inside Just (Prism) → celsius/fahrenheit (Iso)
	const composed = compose(celsiusToFahrenheit)(justNumPrism);

	it("tag is 'Prism'", () => {
		expect(composed.tag).toBe("Prism");
	});

	it("preview applies Iso.to through the Prism", () => {
		// 0°C = 32°F
		expect(composed.preview(M.just(0))).toEqual(M.just(32));
	});

	it("preview fails when Prism does not match", () => {
		expect(composed.preview(M.nothing())).toEqual(M.nothing());
	});

	it("law PreviewReview: preview(review(a)) ≡ Just(a)", () => {
		expect(composed.preview(composed.review(100))).toEqual(M.just(100));
	});
});

describe("Prism + Lens = Prism", () => {
	// Either<string, {level, title}> → Right branch (Prism) → level (Lens)
	type Role = { level: number; title: string };
	const rightPrism = Prism._right<string, Role>();
	const levelLens = pipe(Lens.identity<Role>(), Lens.prop("level"));
	const composed = compose(levelLens)(rightPrism);

	it("tag is 'Prism'", () => {
		expect(composed.tag).toBe("Prism");
	});

	it("preview succeeds when Prism matches", () => {
		expect(composed.preview(E.right({ level: 3, title: "Senior" }))).toEqual(M.just(3));
	});

	it("preview fails when Prism does not match", () => {
		expect(composed.preview(E.left("pending") as E.Either<string, Role>)).toEqual(M.nothing());
	});

	it("law PreviewReview: preview(review(a)) ≡ Just(a)", () => {
		expect(composed.preview(composed.review(5))).toEqual(M.just(5));
	});
});

describe("Prism + Prism = Prism", () => {
	// Maybe<Maybe<number>> → Just (Prism) → Just (Prism)
	const outerPrism = Prism._just<Maybe<number>>();
	const composed = compose(justNumPrism)(outerPrism);

	it("tag is 'Prism'", () => {
		expect(composed.tag).toBe("Prism");
	});

	it("preview succeeds when both match", () => {
		expect(composed.preview(M.just(M.just(42)))).toEqual(M.just(42));
	});

	it("preview fails when outer fails", () => {
		expect(composed.preview(M.nothing())).toEqual(M.nothing());
	});

	it("preview fails when inner fails", () => {
		expect(composed.preview(M.just(M.nothing()))).toEqual(M.nothing());
	});

	it("law PreviewReview: preview(review(a)) ≡ Just(a)", () => {
		expect(composed.preview(composed.review(7))).toEqual(M.just(7));
	});
});

describe("Prism + Traversal = Traversal", () => {
	// Maybe<number[]> → Just (Prism) → each number (Traversal)
	const justArr = Prism._just<number[]>();
	const composed = compose(eachNum)(justArr);

	it("tag is 'Traversal'", () => {
		expect(composed.tag).toBe("Traversal");
	});

	it("toArray collects foci when Prism matches", () => {
		expect(composed.toArray(M.just([1, 2, 3]))).toEqual([1, 2, 3]);
	});

	it("toArray returns empty when Prism fails", () => {
		expect(composed.toArray(M.nothing())).toEqual([]);
	});

	it("modify transforms foci when Prism matches", () => {
		expect(composed.modify((n) => n * 10)(M.just([1, 2, 3]))).toEqual(M.just([10, 20, 30]));
	});

	it("modify is no-op when Prism fails", () => {
		const nothing: Maybe<number[]> = M.nothing();
		expect(composed.modify((n) => n * 10)(nothing)).toEqual(M.nothing());
	});

	it("law Identity: modify(id)(s) ≡ s", () => {
		expect(composed.modify((x) => x)(M.just([1, 2]))).toEqual(M.just([1, 2]));
	});
});

// ---------------------------------------------------------------------------
// Traversal as `from`
// ---------------------------------------------------------------------------

describe("Traversal + Iso = Traversal", () => {
	// number[] → each number (Traversal) → celsius/fahrenheit (Iso)
	const composed = compose(celsiusToFahrenheit)(eachNum);

	it("tag is 'Traversal'", () => {
		expect(composed.tag).toBe("Traversal");
	});

	it("toArray applies Iso.to to each focus", () => {
		// 0°C=32°F, 100°C=212°F
		const result = composed.toArray([0, 100]);
		expect(result[0]).toBeCloseTo(32);
		expect(result[1]).toBeCloseTo(212);
	});

	it("modify transforms each focus through the Iso", () => {
		// Add 1°F in the Fahrenheit space: 0°C → 32°F → 33°F → back to °C
		const result = composed.modify((f) => f + 1)([0]);
		expect(result[0]).toBeCloseTo(((33 - 32) * 5) / 9);
	});

	it("law Identity: modify(id)(s) ≡ s", () => {
		expect(composed.modify((x) => x)([0, 37, 100])).toEqual([0, 37, 100]);
	});
});

describe("Traversal + Lens = Traversal", () => {
	// User[] → each User (Traversal) → name (Lens)
	type User = { name: string; age: number };
	const eachUser = Traversal.each<User>();
	const nameLens = pipe(Lens.identity<User>(), Lens.prop("name"));
	const composed = compose(nameLens)(eachUser);

	const users: User[] = [
		{ name: "Alice", age: 30 },
		{ name: "Bob", age: 25 },
	];

	it("tag is 'Traversal'", () => {
		expect(composed.tag).toBe("Traversal");
	});

	it("toArray collects all names", () => {
		expect(composed.toArray(users)).toEqual(["Alice", "Bob"]);
	});

	it("modify transforms all names", () => {
		const result = composed.modify((s) => s.toUpperCase())(users);
		expect(result[0].name).toBe("ALICE");
		expect(result[1].name).toBe("BOB");
		expect(result[0].age).toBe(30); // other fields untouched
	});

	it("law Identity: modify(id)(s) ≡ s", () => {
		expect(composed.modify((x) => x)(users)).toEqual(users);
	});

	it("law Composition: modify(f)(modify(g)(s)) ≡ modify(f∘g)(s)", () => {
		const f = (s: string) => s.toUpperCase();
		const g = (s: string) => s + "!";
		expect(composed.modify(f)(composed.modify(g)(users))).toEqual(
			composed.modify((x) => f(g(x)))(users),
		);
	});
});

describe("Traversal + Prism = Traversal", () => {
	// Maybe<number>[] → each Maybe (Traversal) → number inside Just (Prism)
	const eachMaybe = Traversal.each<Maybe<number>>();
	const composed = compose(justNumPrism)(eachMaybe);

	const data: Maybe<number>[] = [M.just(1), M.nothing(), M.just(3)];

	it("tag is 'Traversal'", () => {
		expect(composed.tag).toBe("Traversal");
	});

	it("toArray collects only the Just values", () => {
		expect(composed.toArray(data)).toEqual([1, 3]);
	});

	it("toArray returns empty when all are Nothing", () => {
		expect(composed.toArray([M.nothing(), M.nothing()])).toEqual([]);
	});

	it("modify transforms only the Just values, leaving Nothing untouched", () => {
		expect(composed.modify((n) => n * 10)(data)).toEqual([M.just(10), M.nothing(), M.just(30)]);
	});

	it("law Identity: modify(id)(s) ≡ s", () => {
		expect(composed.modify((x) => x)(data)).toEqual(data);
	});
});

describe("Traversal + Traversal = Traversal", () => {
	// number[][] → each row (Traversal) → each number in row (Traversal)
	const eachRow = Traversal.each<number[]>();
	const composed = compose(eachNum)(eachRow);

	const matrix = [
		[1, 2],
		[3, 4],
		[5, 6],
	];

	it("tag is 'Traversal'", () => {
		expect(composed.tag).toBe("Traversal");
	});

	it("toArray flattens all foci", () => {
		expect(composed.toArray(matrix)).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it("modify transforms all foci", () => {
		expect(composed.modify((n) => n * 2)(matrix)).toEqual([
			[2, 4],
			[6, 8],
			[10, 12],
		]);
	});

	it("law Identity: modify(id)(s) ≡ s", () => {
		expect(composed.modify((x) => x)(matrix)).toEqual(matrix);
	});

	it("law Composition: modify(f)(modify(g)(s)) ≡ modify(f∘g)(s)", () => {
		const f = (n: number) => n + 1;
		const g = (n: number) => n * 2;
		expect(composed.modify(f)(composed.modify(g)(matrix))).toEqual(
			composed.modify((x) => f(g(x)))(matrix),
		);
	});
});

// ---------------------------------------------------------------------------
// Associativity — compose is associative regardless of optic mix
// ---------------------------------------------------------------------------

describe("Associativity", () => {
	it("Lens ∘ Lens ∘ Lens is associative", () => {
		const ceoLens = pipe(Lens.identity<{ ceo: Person }>(), Lens.prop("ceo"));

		// (ceo ∘ address) ∘ street
		const leftAssoc = compose(streetLens)(compose(addressLens)(ceoLens));
		// ceo ∘ (address ∘ street)
		const rightAssoc = compose(compose(streetLens)(addressLens))(ceoLens);

		const s = { ceo: alice };
		expect(leftAssoc.get(s)).toBe(rightAssoc.get(s));
		expect(leftAssoc.set("New St")(s)).toEqual(rightAssoc.set("New St")(s));
	});

	it("Prism ∘ Prism ∘ Prism is associative", () => {
		const outermost = Prism._just<Maybe<Maybe<number>>>();
		const middle = Prism._just<Maybe<number>>();
		const innermost = Prism._just<number>();

		// (outermost ∘ middle) ∘ innermost
		const leftAssoc = compose(innermost)(compose(middle)(outermost));
		// outermost ∘ (middle ∘ innermost)
		const rightAssoc = compose(compose(innermost)(middle))(outermost);

		const s: Maybe<Maybe<Maybe<number>>> = M.just(M.just(M.just(99)));
		expect(leftAssoc.preview(s)).toEqual(rightAssoc.preview(s));
		expect(leftAssoc.review(99)).toEqual(rightAssoc.review(99));
	});

	it("Traversal ∘ Traversal ∘ Traversal is associative", () => {
		const eachMatrix = Traversal.each<number[][]>();
		const eachRow = Traversal.each<number[]>();

		// (eachMatrix ∘ eachRow) ∘ eachNum
		const leftAssoc = compose(eachNum)(compose(eachRow)(eachMatrix));
		// eachMatrix ∘ (eachRow ∘ eachNum)
		const rightAssoc = compose(compose(eachNum)(eachRow))(eachMatrix);

		const cube = [
			[
				[1, 2],
				[3, 4],
			],
			[
				[5, 6],
				[7, 8],
			],
		];
		expect(leftAssoc.toArray(cube)).toEqual(rightAssoc.toArray(cube));
		expect(leftAssoc.modify((n) => n + 1)(cube)).toEqual(rightAssoc.modify((n) => n + 1)(cube));
	});
});
