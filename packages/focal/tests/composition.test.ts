/**
 * Cross-type optic composition.
 *
 * Optics form a hierarchy — composing different types yields the "weaker" type:
 *
 *   Iso > Lens > Prism > Traversal  (strongest → weakest)
 *
 * Composing always yields the weaker type because the result can only
 * guarantee the capabilities of the weakest link.
 *
 * Outline:
 *   1. Lens + Prism = Prism
 *   2. Lens + Traversal = Traversal
 *   3. Prism + Lens = Prism
 *   4. Prism + Traversal = Traversal
 *   5. Traversal + Lens = Traversal
 *   6. Traversal + Prism = Traversal
 *   7. Real-world scenario: deep mixed composition
 */

import type { Either } from "@oofp/core/either";
import * as E from "@oofp/core/either";
import * as M from "@oofp/core/maybe";
import type { Maybe } from "@oofp/core/maybe";
import { describe, expect, it } from "vitest";

import { pipe } from "@oofp/core/pipe";
import { compose } from "../lib/compose.ts";
import * as Iso from "../lib/iso.ts";
import * as Lens from "../lib/lens.ts";
import * as Prism from "../lib/prism.ts";
import * as Traversal from "../lib/traversal.ts";
import { celsiusToFahrenheit, pairToTuple } from "./iso/fixtures.ts";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

interface User {
	name: string;
	age: number;
	email: Maybe<string>;
	scores: number[];
	role: Either<string, { level: number; title: string }>;
}

const alice: User = {
	name: "Alice",
	age: 30,
	email: M.just("alice@example.com"),
	scores: [85, 92, 78],
	role: E.right({ level: 3, title: "Senior" }),
};

const bob: User = {
	name: "Bob",
	age: 25,
	email: M.nothing(),
	scores: [60, 70],
	role: E.left("pending"),
};

// ============================================================================
// 1. Lens + Prism = Prism
// ============================================================================

describe("Lens + Prism = Prism", () => {
	// Focus: User → email (Lens) → string inside Maybe (Prism)
	const emailLens = pipe(Lens.identity<User>(), Lens.prop("email"));
	const justPrism = Prism._just<string>();
	const userEmail = compose(justPrism)(emailLens);

	it("preview succeeds when the Prism matches", () => {
		expect(userEmail.preview(alice)).toEqual(M.just("alice@example.com"));
	});

	it("preview fails when the Prism does not match", () => {
		expect(userEmail.preview(bob)).toEqual(M.nothing());
	});

	it("satisfies PreviewReview", () => {
		const email = "test@test.com";
		expect(userEmail.preview(userEmail.review(email))).toEqual(M.just(email));
	});
});

// ============================================================================
// 2. Lens + Traversal = Traversal
// ============================================================================

describe("Lens + Traversal = Traversal", () => {
	// Focus: User → scores (Lens) → each number (Traversal)
	const scoresLens = pipe(Lens.identity<User>(), Lens.prop("scores"));
	const eachScore = Traversal.each<number>();
	const allScores = compose(eachScore)(scoresLens);

	it("toArray collects all foci", () => {
		expect(allScores.toArray(alice)).toEqual([85, 92, 78]);
	});

	it("modify transforms all foci", () => {
		const updated = allScores.modify((n) => n + 5)(alice);
		expect(updated.scores).toEqual([90, 97, 83]);
		expect(updated.name).toBe("Alice"); // other fields untouched
	});

	it("satisfies Identity law", () => {
		expect(allScores.modify((x) => x)(alice)).toEqual(alice);
	});

	it("satisfies Composition law", () => {
		const f = (n: number) => n + 1;
		const g = (n: number) => n * 2;
		expect(allScores.modify(f)(allScores.modify(g)(alice))).toEqual(
			allScores.modify((x) => f(g(x)))(alice),
		);
	});
});

// ============================================================================
// 3. Prism + Lens = Prism
// ============================================================================

describe("Prism + Lens = Prism", () => {
	// Focus: Either<string, {level, title}> → {level, title} (Prism) → level (Lens)
	const rightPrism = Prism._right<string, { level: number; title: string }>();
	const levelLens = pipe(Lens.identity<{ level: number; title: string }>(), Lens.prop("level"));
	const roleLevel = compose(levelLens)(rightPrism);

	it("preview succeeds when the Prism matches", () => {
		expect(roleLevel.preview(E.right({ level: 3, title: "Senior" }))).toEqual(M.just(3));
	});

	it("preview fails when the Prism does not match", () => {
		expect(
			roleLevel.preview(E.left("pending") as Either<string, { level: number; title: string }>),
		).toEqual(M.nothing());
	});

	it("satisfies PreviewReview", () => {
		const a = 5;
		expect(roleLevel.preview(roleLevel.review(a))).toEqual(M.just(a));
	});
});

// ============================================================================
// 4. Prism + Traversal = Traversal
// ============================================================================

describe("Prism + Traversal = Traversal", () => {
	// Focus: Maybe<number[]> → number[] (Prism) → each number (Traversal)
	const justPrism = Prism._just<number[]>();
	const eachNum = Traversal.each<number>();
	const maybeNums = compose(eachNum)(justPrism);

	it("toArray collects foci when Prism matches", () => {
		expect(maybeNums.toArray(M.just([1, 2, 3]))).toEqual([1, 2, 3]);
	});

	it("toArray returns empty when Prism fails", () => {
		expect(maybeNums.toArray(M.nothing())).toEqual([]);
	});

	it("modify transforms foci when Prism matches", () => {
		const result = maybeNums.modify((n) => n * 10)(M.just([1, 2, 3]));
		expect(result).toEqual(M.just([10, 20, 30]));
	});

	it("modify returns s unchanged when Prism fails", () => {
		const nothing: Maybe<number[]> = M.nothing();
		expect(maybeNums.modify((n) => n * 10)(nothing)).toEqual(M.nothing());
	});

	it("satisfies Identity law", () => {
		expect(maybeNums.modify((x) => x)(M.just([1, 2]))).toEqual(M.just([1, 2]));
	});

	it("satisfies Composition law", () => {
		const s = M.just([1, 2, 3]);
		const f = (n: number) => n + 1;
		const g = (n: number) => n * 2;
		expect(maybeNums.modify(f)(maybeNums.modify(g)(s))).toEqual(
			maybeNums.modify((x) => f(g(x)))(s),
		);
	});
});

// ============================================================================
// 5. Traversal + Lens = Traversal
// ============================================================================

describe("Traversal + Lens = Traversal", () => {
	// Focus: User[] → each User (Traversal) → name (Lens)
	const eachUser = Traversal.each<User>();
	const nameLens = pipe(Lens.identity<User>(), Lens.prop("name"));
	const allNames = compose(nameLens)(eachUser);

	const users = [alice, bob];

	it("toArray collects all names", () => {
		expect(allNames.toArray(users)).toEqual(["Alice", "Bob"]);
	});

	it("modify transforms all names", () => {
		const result = allNames.modify((s) => s.toUpperCase())(users);
		expect(result[0].name).toBe("ALICE");
		expect(result[1].name).toBe("BOB");
	});

	it("other fields are untouched", () => {
		const result = allNames.modify((s) => s.toUpperCase())(users);
		expect(result[0].age).toBe(30);
		expect(result[1].age).toBe(25);
	});

	it("satisfies Identity law", () => {
		expect(allNames.modify((x) => x)(users)).toEqual(users);
	});

	it("satisfies Composition law", () => {
		const f = (s: string) => s.toUpperCase();
		const g = (s: string) => s + "!";
		expect(allNames.modify(f)(allNames.modify(g)(users))).toEqual(
			allNames.modify((x) => f(g(x)))(users),
		);
	});
});

// ============================================================================
// 6. Traversal + Prism = Traversal
// ============================================================================

describe("Traversal + Prism = Traversal", () => {
	// Focus: Maybe<number>[] → each Maybe (Traversal) → number inside Just (Prism)
	const eachMaybe = Traversal.each<Maybe<number>>();
	const justPrism = Prism._just<number>();
	const justValues = compose(justPrism)(eachMaybe);

	const data: Maybe<number>[] = [M.just(1), M.nothing(), M.just(3), M.nothing(), M.just(5)];

	it("toArray collects only the Just values", () => {
		expect(justValues.toArray(data)).toEqual([1, 3, 5]);
	});

	it("toArray returns empty when all are Nothing", () => {
		expect(justValues.toArray([M.nothing(), M.nothing()])).toEqual([]);
	});

	it("modify transforms only the Just values, leaving Nothing untouched", () => {
		const result = justValues.modify((n) => n * 10)(data);
		expect(result).toEqual([M.just(10), M.nothing(), M.just(30), M.nothing(), M.just(50)]);
	});

	it("satisfies Identity law", () => {
		expect(justValues.modify((x) => x)(data)).toEqual(data);
	});

	it("satisfies Composition law", () => {
		const f = (n: number) => n + 1;
		const g = (n: number) => n * 2;
		expect(justValues.modify(f)(justValues.modify(g)(data))).toEqual(
			justValues.modify((x) => f(g(x)))(data),
		);
	});
});

// ============================================================================
// 7. Real-world scenario: deep mixed composition
// ============================================================================

describe("Real-world: deep mixed composition", () => {
	// Scenario: We have a list of Users. We want to target:
	// "all score values of users who have an email"
	//
	// Path: User[] → each User (Traversal) ... but we only want users
	// with email. We can use a filtered traversal + lens + traversal chain.

	// Approach: each user → scores lens → each score
	// (Filter separately for clarity)

	const eachUser = Traversal.each<User>();
	const scoresLens = pipe(Lens.identity<User>(), Lens.prop("scores"));
	const eachScore = Traversal.each<number>();

	// Lens<User, number[]> + Traversal<number[], number> = Traversal<User, number>
	const userScores = compose(eachScore)(scoresLens);

	// Modify all of alice's scores
	it("modify all scores of a single user", () => {
		const curved = userScores.modify((n) => Math.min(100, n + 5))(alice);
		expect(curved.scores).toEqual([90, 97, 83]);
		expect(curved.name).toBe("Alice");
	});

	// Lens + Prism: lens to email, prism into Just
	const emailLens = pipe(Lens.identity<User>(), Lens.prop("email"));
	const justPrism = Prism._just<string>();
	const userEmailStr = compose(justPrism)(emailLens);

	it("preview email for users who have one", () => {
		expect(userEmailStr.preview(alice)).toEqual(M.just("alice@example.com"));
		expect(userEmailStr.preview(bob)).toEqual(M.nothing());
	});

	// Combine: get the first score of each user (Traversal + Prism via index)
	const firstScore = Prism.index<number>(0);
	const eachUsersFirstScore = compose(firstScore)(compose(scoresLens)(eachUser));

	it("collect first score of each user (may be missing for empty scores)", () => {
		const users = [alice, bob, { ...alice, scores: [] }];
		expect(eachUsersFirstScore.toArray(users)).toEqual([85, 60]);
	});

	it("modify first score of each user (bump by 10)", () => {
		const users = [alice, bob];
		const result = eachUsersFirstScore.modify((n) => n + 10)(users);
		expect(result[0].scores).toEqual([95, 92, 78]);
		expect(result[1].scores).toEqual([70, 70]);
	});
});

// ============================================================================
// 8. Iso compositions
// ============================================================================

describe("Iso + Iso = Iso", () => {
	// celsiusToFahrenheit: number ↔ number, then reverse it back
	const identity = compose(Iso.reverse(celsiusToFahrenheit))(celsiusToFahrenheit);

	it("to is identity", () => {
		for (const n of [0, 100, -40]) {
			expect(identity.to(n)).toBeCloseTo(n);
		}
	});

	it("from is identity", () => {
		for (const n of [0, 100, -40]) {
			expect(identity.from(n)).toBeCloseTo(n);
		}
	});

	it("satisfies RoundTrip1", () => {
		for (const n of [0, 37, -10]) {
			expect(identity.from(identity.to(n))).toBeCloseTo(n);
		}
	});
});

describe("Iso + Lens = Lens", () => {
	// pairToTuple: Pair ↔ [number, string]
	// compose with a Lens that gets the first element of the tuple
	const fstLens = Lens.make<[number, string], number>(
		([n]) => n,
		(n) =>
			([, s]) => [n, s],
	);
	const pairFst = compose(fstLens)(pairToTuple);

	it("get extracts fst through the Iso", () => {
		expect(pairFst.get({ fst: 42, snd: "hello" })).toBe(42);
	});

	it("set updates through the Iso", () => {
		const result = pairFst.set(99)({ fst: 42, snd: "hello" });
		expect(result).toEqual({ fst: 99, snd: "hello" });
	});

	it("satisfies GetPut", () => {
		const p = { fst: 7, snd: "x" };
		expect(pairFst.set(pairFst.get(p))(p)).toEqual(p);
	});
});

describe("Iso + Prism = Prism", () => {
	// Build an Iso<number, Tagged> where Tagged is a discriminated union
	type Tagged = { sign: "pos"; value: number } | { sign: "neg"; value: number };

	const numToTagged = Iso.make<number, Tagged>(
		(n) => ({ sign: n >= 0 ? "pos" : "neg", value: Math.abs(n) }),
		(t) => (t.sign === "pos" ? t.value : -t.value),
	);

	// compose with a Prism that only matches positive numbers
	const positiveF = Prism.matchWith<Tagged>()(
		"sign",
		"pos",
		(s) => s.value,
		(v) => ({ sign: "pos", value: v }),
	);

	const positiveMagnitude = compose(positiveF)(numToTagged);

	it("preview succeeds when Prism matches", () => {
		expect(positiveMagnitude.preview(5)).toEqual(M.just(5));
	});

	it("preview fails when Prism does not match", () => {
		expect(positiveMagnitude.preview(-3)).toEqual(M.nothing());
	});

	it("satisfies PreviewReview", () => {
		expect(positiveMagnitude.preview(positiveMagnitude.review(10))).toEqual(M.just(10));
	});
});

describe("Iso + Traversal = Traversal", () => {
	// Iso<number[], number[]> (identity-ish) composed with each<number>()
	const arrIso = Iso.make<number[], number[]>(
		(arr) => arr.map((n) => n * 1),
		(arr) => arr.map((n) => n * 1),
	);
	const eachNum = Traversal.each<number>();
	const isoThenEach = compose(eachNum)(arrIso);

	it("toArray collects all foci through the Iso", () => {
		expect(isoThenEach.toArray([1, 2, 3])).toEqual([1, 2, 3]);
	});

	it("modify transforms all foci through the Iso", () => {
		expect(isoThenEach.modify((n) => n * 2)([1, 2, 3])).toEqual([2, 4, 6]);
	});

	it("satisfies Identity law", () => {
		expect(isoThenEach.modify((x) => x)([1, 2, 3])).toEqual([1, 2, 3]);
	});
});
