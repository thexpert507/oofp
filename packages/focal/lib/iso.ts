/**
 * Iso<A, B> — a composable, lawful optic representing a lossless, reversible
 * conversion between types A and B.
 *
 * Laws:
 *   RoundTrip1:  from(to(a))  ≡  a
 *   RoundTrip2:  to(from(b))  ≡  b
 */

import * as M from "@oofp/core/maybe";
import type { Lens } from "./lens.ts";
import type { Prism } from "./prism.ts";
import type { Traversal } from "./traversal.ts";

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export interface Iso<A, B> {
	readonly tag: "Iso";
	readonly to: (a: A) => B;
	readonly from: (b: B) => A;
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/** Create an Iso from a pair of conversion functions.
 *
 * ```ts
 * const celsiusToFahrenheit = Iso.make(
 *   (c: number) => c * 9 / 5 + 32,
 *   (f: number) => (f - 32) * 5 / 9,
 * );
 * ```
 */
export const make = <A, B>(to: (a: A) => B, from: (b: B) => A): Iso<A, B> => ({
	tag: "Iso",
	to,
	from,
});

/** The identity Iso — A ↔ A. Both directions are the identity function. */
export const identity = <A>(): Iso<A, A> => ({
	tag: "Iso",
	to: (a) => a,
	from: (a) => a,
});

/** Reverse an Iso: swap `to` and `from`. Pipe-friendly: `pipe(iso, reverse)`.
 *
 * ```ts
 * pipe(celsiusToFahrenheit, reverse) // Iso<Fahrenheit, Celsius>
 * ```
 */
export const reverse = <A, B>(iso: Iso<A, B>): Iso<B, A> => ({
	tag: "Iso",
	to: iso.from,
	from: iso.to,
});

// ---------------------------------------------------------------------------
// Conversion to weaker optics
// ---------------------------------------------------------------------------

/** Convert an Iso to a Lens. `get = to`, `set(b)(_) = from(b)`.
 *
 * ```ts
 * pipe(pairToTuple, toLens) // Lens<Pair, [number, string]>
 * ```
 */
export const toLens = <A, B>(iso: Iso<A, B>): Lens<A, B> => ({
	tag: "Lens",
	get: iso.to,
	set: (b) => () => iso.from(b),
});

/** Convert an Iso to a Prism. `preview = Just ∘ to`, `review = from`.
 *
 * ```ts
 * pipe(stringToChars, toPrism) // Prism<string, string[]>
 * ```
 */
export const toPrism = <A, B>(iso: Iso<A, B>): Prism<A, B> => ({
	tag: "Prism",
	preview: (a) => M.just(iso.to(a)),
	review: iso.from,
});

// ---------------------------------------------------------------------------
// Operations (iso flows through the pipe)
// ---------------------------------------------------------------------------

/** Apply the forward direction of an Iso.
 *
 * ```ts
 * pipe(celsiusToFahrenheit, view(100)) // => 212
 * ```
 */
export const view =
	<A>(a: A) =>
	<B>(iso: Iso<A, B>): B =>
		iso.to(a);

/** Apply the backward direction of an Iso.
 *
 * ```ts
 * pipe(celsiusToFahrenheit, review(212)) // => 100
 * ```
 */
export const review =
	<B>(b: B) =>
	<A>(iso: Iso<A, B>): A =>
		iso.from(b);

/** Modify a value: convert to B, apply f, convert back to A.
 *
 * ```ts
 * pipe(celsiusToFahrenheit, over(f => f * 2))(100) // 100C → 212F → 424F → ~217.8C
 * ```
 */
export const over =
	<B>(f: (b: B) => B) =>
	<A>(iso: Iso<A, B>) =>
	(a: A): A =>
		iso.from(f(iso.to(a)));

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/** Unified compose (pipe-friendly, discriminates on to.tag).
 *
 * - Iso + Iso       = Iso
 * - Iso + Lens      = Lens
 * - Iso + Prism     = Prism
 * - Iso + Traversal = Traversal
 */
export function compose<B, C>(to: Iso<B, C>): <A>(from: Iso<A, B>) => Iso<A, C>;
export function compose<B, C>(to: Lens<B, C>): <A>(from: Iso<A, B>) => Lens<A, C>;
export function compose<B, C>(to: Prism<B, C>): <A>(from: Iso<A, B>) => Prism<A, C>;
export function compose<B, C>(to: Traversal<B, C>): <A>(from: Iso<A, B>) => Traversal<A, C>;
export function compose<B, C>(
	to: Iso<B, C> | Lens<B, C> | Prism<B, C> | Traversal<B, C>,
): <A>(from: Iso<A, B>) => Iso<A, C> | Lens<A, C> | Prism<A, C> | Traversal<A, C> {
	return <A>(from: Iso<A, B>) => {
		if (to.tag === "Traversal") {
			const traversal = to as Traversal<B, C>;
			return {
				tag: "Traversal" as const,
				modify: (f: (c: C) => C) => (a: A) => from.from(traversal.modify(f)(from.to(a))),
				toArray: (a: A) => traversal.toArray(from.to(a)),
			};
		}
		if (to.tag === "Prism") {
			const prism = to as Prism<B, C>;
			return {
				tag: "Prism" as const,
				preview: (a: A) => prism.preview(from.to(a)),
				review: (c: C) => from.from(prism.review(c)),
			};
		}
		if (to.tag === "Lens") {
			const lens = to as Lens<B, C>;
			return {
				tag: "Lens" as const,
				get: (a: A) => lens.get(from.to(a)),
				set: (c: C) => (a: A) => from.from(lens.set(c)(from.to(a))),
			};
		}
		// default: Iso + Iso
		const inner = to as Iso<B, C>;
		return {
			tag: "Iso" as const,
			to: (a: A) => inner.to(from.to(a)),
			from: (c: C) => from.from(inner.from(c)),
		};
	};
}
