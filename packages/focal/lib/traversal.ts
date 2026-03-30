/**
 * Traversal<S, A> — a composable, lawful optic that focuses on
 * **zero or more** parts A within a whole S.
 *
 * Laws:
 *   Identity:    modify(id)(s)              ≡ s
 *   Composition: modify(f)(modify(g)(s))    ≡ modify(x => f(g(x)))(s)
 */

import * as M from "@oofp/core/maybe";
import type { Lens } from "./lens.ts";
import type { Prism } from "./prism.ts";
import { prismModify } from "./prism.ts";

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export interface Traversal<S, A> {
	readonly tag: "Traversal";
	/** Modify every focus in a single pass. This is the fundamental operation. */
	readonly modify: (f: (a: A) => A) => (s: S) => S;
	/** Collect all foci into an array. */
	readonly toArray: (s: S) => A[];
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/** Traversal over all elements of an array.
 *
 * ```ts
 * pipe(each<number>(), collect([1, 2, 3])) // => [1, 2, 3]
 * ```
 */
export const each = <A>(): Traversal<A[], A> => ({
	tag: "Traversal",
	modify: (f) => (s) => s.map(f),
	toArray: (s) => s,
});

/** Traversal over all values of a Record<string, A>.
 *
 * ```ts
 * pipe(eachValue<number>(), collect({ a: 1, b: 2 })) // => [1, 2]
 * ```
 */
export const eachValue = <A>(): Traversal<Record<string, A>, A> => ({
	tag: "Traversal",
	modify: (f) => (s) => {
		const result: Record<string, A> = {};
		for (const key in s) {
			if (Object.prototype.hasOwnProperty.call(s, key)) {
				result[key] = f(s[key]);
			}
		}
		return result;
	},
	toArray: (s) => Object.values(s),
});

/** Traversal that focuses only on elements matching a predicate.
 *
 * ```ts
 * pipe(filtered<number>(n => n > 2), collect([1, 2, 3, 4])) // => [3, 4]
 * ```
 */
export const filtered = <A>(pred: (a: A) => boolean): Traversal<A[], A> => ({
	tag: "Traversal",
	modify: (f) => (s) => s.map((a) => (pred(a) ? f(a) : a)),
	toArray: (s) => s.filter(pred),
});

/** Create a Traversal from custom `modify` and `toArray` implementations.
 *
 * ```ts
 * const leaves = Traversal.make(modifyLeaves, collectLeaves);
 * ```
 */
export const make = <S, A>(
	modify: (f: (a: A) => A) => (s: S) => S,
	toArray: (s: S) => A[],
): Traversal<S, A> => ({ tag: "Traversal", modify, toArray });

// ---------------------------------------------------------------------------
// Operations (traversal flows through the pipe)
// ---------------------------------------------------------------------------

/** Collect all foci into an array.
 *
 * ```ts
 * pipe(each<number>(), collect([1, 2, 3])) // => [1, 2, 3]
 * ```
 */
export const collect =
	<S>(s: S) =>
	<A>(t: Traversal<S, A>): A[] =>
		t.toArray(s);

/** Modify every focus with a function, returning an updater `S => S`.
 *
 * ```ts
 * pipe(each<number>(), modify(n => n * 2))([1, 2, 3]) // => [2, 4, 6]
 * ```
 */
export const modify =
	<A>(f: (a: A) => A) =>
	<S>(t: Traversal<S, A>) =>
	(s: S): S =>
		t.modify(f)(s);

/** Replace every focus with a constant value, returning an updater `S => S`.
 *
 * ```ts
 * pipe(each<number>(), set(0))([1, 2, 3]) // => [0, 0, 0]
 * ```
 */
export const set =
	<A>(a: A) =>
	<S>(t: Traversal<S, A>) =>
	(s: S): S =>
		t.modify(() => a)(s);

/** Fold all foci using a combining function and initial value.
 *
 * ```ts
 * pipe(each<number>(), fold(0, (acc, n) => acc + n))([1, 2, 3]) // => 6
 * ```
 */
export const fold =
	<B, A>(init: B, f: (acc: B, a: A) => B) =>
	<S>(t: Traversal<S, A>) =>
	(s: S): B =>
		t.toArray(s).reduce(f, init);

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

export function compose<A, B>(to: Traversal<A, B>): <S>(from: Traversal<S, A>) => Traversal<S, B>;
export function compose<A, B>(to: Lens<A, B>): <S>(from: Traversal<S, A>) => Traversal<S, B>;
export function compose<A, B>(to: Prism<A, B>): <S>(from: Traversal<S, A>) => Traversal<S, B>;
export function compose<A, B>(
	to: Traversal<A, B> | Lens<A, B> | Prism<A, B>,
): <S>(from: Traversal<S, A>) => Traversal<S, B> {
	return <S>(from: Traversal<S, A>) => {
		if (to.tag === "Lens") {
			const lens = to as Lens<A, B>;
			return {
				tag: "Traversal" as const,
				modify: (f: (b: B) => B) => from.modify((a: A) => lens.set(f(lens.get(a)))(a)),
				toArray: (s: S) => from.toArray(s).map(lens.get),
			};
		}
		if (to.tag === "Prism") {
			const prism = to as Prism<A, B>;
			const cachedModify = prismModify(prism);
			return {
				tag: "Traversal" as const,
				modify: (f: (b: B) => B) => from.modify(cachedModify(f)),
				toArray: (s: S) => {
					const result: B[] = [];
					for (const a of from.toArray(s)) {
						const mb = prism.preview(a);
						if (M.isJust(mb)) result.push(mb.value);
					}
					return result;
				},
			};
		}
		// default: Traversal + Traversal
		const inner = to as Traversal<A, B>;
		return {
			tag: "Traversal" as const,
			modify: (f: (b: B) => B) => from.modify(inner.modify(f)),
			toArray: (s: S) => {
				const result: B[] = [];
				for (const a of from.toArray(s)) {
					for (const b of inner.toArray(a)) {
						result.push(b);
					}
				}
				return result;
			},
		};
	};
}
