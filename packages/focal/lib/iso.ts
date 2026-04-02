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

// ---------------------------------------------------------------------------
// URI — self-registration in the HKT registry
// ---------------------------------------------------------------------------

export const URI = "Iso";
export type URI = typeof URI;

declare module "./hkt.ts" {
	interface URItoKind<S, A> {
		Iso: Iso<S, A>;
	}
}

// ---------------------------------------------------------------------------
// Type — minimal data, no embedded behaviour
// ---------------------------------------------------------------------------

export interface Iso<A, B> {
	readonly tag: "Iso";
	readonly to: (a: A) => B;
	readonly from: (b: B) => A;
}

declare module "./hkt" {
	interface URItoKind<S, A> {
		Iso: Iso<S, A>;
	}
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
// Operations — free functions, all logic lives here
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
 * pipe(celsiusToFahrenheit, modify(f => f * 2))(100) // 100C → 212F → 424F → ~217.8C
 * ```
 */
export const modify =
	<B>(f: (b: B) => B) =>
	<A>(iso: Iso<A, B>) =>
	(a: A): A =>
		iso.from(f(iso.to(a)));
