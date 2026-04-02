/**
 * Prism<S, A> — a composable, lawful optic for focusing on a part A
 * that **may or may not exist** within a whole S.
 *
 * Laws:
 *   PreviewReview:  preview(review(a))                    ≡ Just(a)
 *   ReviewPreview:  if preview(s) = Just(a), then review(a) ≡ s
 */

import type { Either } from "@oofp/core/either";
import * as E from "@oofp/core/either";
import * as M from "@oofp/core/maybe";
import type { Maybe } from "@oofp/core/maybe";

// ---------------------------------------------------------------------------
// URI — self-registration in the HKT registry
// ---------------------------------------------------------------------------

export const URI = "Prism";
export type URI = typeof URI;

declare module "./hkt.ts" {
	interface URItoKind<S, A> {
		Prism: Prism<S, A>;
	}
}

// ---------------------------------------------------------------------------
// Type — minimal data, no embedded behaviour
// ---------------------------------------------------------------------------

export interface Prism<S, A> {
	readonly tag: "Prism";
	readonly preview: (s: S) => Maybe<A>;
	readonly review: (a: A) => S;
	/** Optional modify override for Prisms where review(f(preview(s))) would be destructive (e.g. `index`). */
	readonly modify?: (f: (a: A) => A) => (s: S) => S;
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/** Create a Prism from a preview and review function, with an optional modify override.
 *
 * The `modify` override is useful for "affine traversal" style Prisms where
 * `review(f(preview(s)))` would be destructive or lose context (e.g. `index`, `optional`).
 *
 * ```ts
 * const intPrism = Prism.make(
 *   (s: string) => { const n = parseInt(s, 10); return isNaN(n) ? M.nothing() : M.just(n); },
 *   (n: number) => String(n),
 * );
 * ```
 */
export const make = <S, A>(
	preview: (s: S) => Maybe<A>,
	review: (a: A) => S,
	modify?: (f: (a: A) => A) => (s: S) => S,
): Prism<S, A> => ({
	tag: "Prism",
	preview,
	review,
	...(modify ? { modify } : {}),
});

/** Prism focusing on the Just branch of a Maybe<A>. */
export const _just = <A>(): Prism<Maybe<A>, A> => ({
	tag: "Prism",
	preview: (s) => s,
	review: (a) => M.just(a),
});

/** Prism focusing on the Nothing branch of a Maybe<A>. Focus type is `void`. */
export const _nothing = <A>(): Prism<Maybe<A>, void> => ({
	tag: "Prism",
	preview: (s) => (M.isNothing(s) ? M.just(undefined) : M.nothing()),
	review: () => M.nothing(),
});

/** Prism focusing on the Right branch of an Either<L, A>. */
export const _right = <L, A>(): Prism<Either<L, A>, A> => ({
	tag: "Prism",
	preview: (s) => (E.isRight(s) ? M.just(s.value) : M.nothing()),
	review: (a) => E.right(a),
});

/** Prism focusing on the Left branch of an Either<L, A>. */
export const _left = <L, A>(): Prism<Either<L, A>, L> => ({
	tag: "Prism",
	preview: (s) => (E.isLeft(s) ? M.just(s.value) : M.nothing()),
	review: (e) => E.left(e),
});

/** Prism focusing on the element at index `i` of an array. Nothing if out of bounds.
 *
 * Note: `review` reconstructs a sparse array; use `modify` for in-place updates.
 */
export const index = <A>(i: number): Prism<A[], A> => ({
	tag: "Prism",
	preview: (arr) => (i >= 0 && i < arr.length ? M.just(arr[i]) : M.nothing()),
	review: (a) => {
		const arr: A[] = new Array(i + 1).fill(undefined);
		arr[i] = a;
		return arr;
	},
	modify: (f) => (arr) => {
		if (i < 0 || i >= arr.length) return arr;
		const newArr = [...arr];
		newArr[i] = f(arr[i]);
		return newArr;
	},
});

/** Strip index-signature keys, keeping only concretely declared literal keys. */
export type StripIndex<T> = {
	[K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

/** Extract the literal tag values for key TK across all members of union S. */
export type TagValues<S, TK extends string> = S extends Record<TK, infer V>
	? string extends V
		? never
		: V
	: never;

/** Prism for a specific variant of a discriminated union (identity form). */
export const match =
	<S>() =>
	<TK extends keyof StripIndex<S> & string, TV extends string>(
		tagKey: TK,
		tagValue: TV & TagValues<S, TK>,
	): Prism<S, Extract<S, Record<TK, TV>>> => ({
		tag: "Prism",
		preview: (s) =>
			s[tagKey as unknown as keyof S] === (tagValue as unknown)
				? M.just(s as Extract<S, Record<TK, TV>>)
				: M.nothing(),
		review: (a) => a as unknown as S,
	});

/** Prism for a specific variant of a discriminated union (with transformation). */
export const matchWith =
	<S>() =>
	<TK extends keyof StripIndex<S> & string, TV extends string, A>(
		tagKey: TK,
		tagValue: TV & TagValues<S, TK>,
		get: (s: Extract<S, Record<TK, TV>>) => A,
		build: (a: A) => S,
	): Prism<S, A> => ({
		tag: "Prism",
		preview: (s) =>
			s[tagKey as unknown as keyof S] === (tagValue as unknown)
				? M.just(get(s as Extract<S, Record<TK, TV>>))
				: M.nothing(),
		review: build,
	});

// ---------------------------------------------------------------------------
// Operations — free functions, all logic lives here
// ---------------------------------------------------------------------------

/** Extract the focus from a value, returning Maybe<A>. */
export const preview =
	<S>(s: S) =>
	<A>(prism: Prism<S, A>): Maybe<A> =>
		prism.preview(s);

/** Construct the whole S from the focus A. */
export const review =
	<A>(a: A) =>
	<S>(prism: Prism<S, A>): S =>
		prism.review(a);

/** Modify the focus (if present) with a function, returning an updater `S => S`. */
export const modify =
	<A>(f: (a: A) => A) =>
	<S>(prism: Prism<S, A>) =>
	(s: S): S => {
		if (prism.modify) return prism.modify(f)(s);
		const ma = prism.preview(s);
		if (M.isNothing(ma)) return s;
		return prism.review(f(ma.value));
	};

/** Replace the focus (if present), returning an updater `S => S`. */
export const set =
	<A>(a: A) =>
	<S>(prism: Prism<S, A>) =>
	(s: S): S =>
		modify<A>(() => a)(prism)(s);
