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
import type { Lens } from "./lens.ts";
import type { Traversal } from "./traversal.ts";

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export interface Prism<S, A> {
	readonly tag: "Prism";
	readonly preview: (s: S) => Maybe<A>;
	readonly review: (a: A) => S;
	/** Override for container-like Prisms (e.g. `index`) where `review` can't preserve surrounding context. */
	readonly modify?: (f: (a: A) => A) => (s: S) => S;
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/** Create a Prism from a preview and review function.
 *
 * ```ts
 * const intPrism = Prism.make(
 *   (s: string) => { const n = parseInt(s, 10); return isNaN(n) ? M.nothing() : M.just(n); },
 *   (n: number) => String(n),
 * );
 * ```
 */
export const make = <S, A>(preview: (s: S) => Maybe<A>, review: (a: A) => S): Prism<S, A> => ({
	tag: "Prism",
	preview,
	review,
});

/** Prism focusing on the Just branch of a Maybe<A>.
 *
 * ```ts
 * pipe(_just<number>(), preview(M.just(42))) // => Just(42)
 * ```
 */
export const _just = <A>(): Prism<Maybe<A>, A> => ({
	tag: "Prism",
	preview: (s) => s,
	review: (a) => M.just(a),
});

/** Prism focusing on the Nothing branch of a Maybe<A>. Focus type is `void`.
 *
 * ```ts
 * pipe(_nothing<string>(), preview(M.nothing())) // => Just(undefined)
 * ```
 */
export const _nothing = <A>(): Prism<Maybe<A>, void> => ({
	tag: "Prism",
	preview: (s) => (M.isNothing(s) ? M.just(undefined) : M.nothing()),
	review: () => M.nothing(),
});

/** Prism focusing on the Right branch of an Either<L, A>.
 *
 * ```ts
 * pipe(_right<string, number>(), preview(E.right(42))) // => Just(42)
 * ```
 */
export const _right = <L, A>(): Prism<Either<L, A>, A> => ({
	tag: "Prism",
	preview: (s) => (E.isRight(s) ? M.just(s.value) : M.nothing()),
	review: (a) => E.right(a),
});

/** Prism focusing on the Left branch of an Either<L, A>.
 *
 * ```ts
 * pipe(_left<string, number>(), preview(E.left("err"))) // => Just("err")
 * ```
 */
export const _left = <L, A>(): Prism<Either<L, A>, L> => ({
	tag: "Prism",
	preview: (s) => (E.isLeft(s) ? M.just(s.value) : M.nothing()),
	review: (e) => E.left(e),
});

/** Prism focusing on the element at index `i` of an array. Nothing if out of bounds.
 * Provides a `modify` override to preserve surrounding array elements.
 *
 * ```ts
 * pipe(index<number>(1), preview([10, 20, 30])) // => Just(20)
 * ```
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
type StripIndex<T> = {
	[K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

/** Extract the literal tag values for key TK across all members of union S,
 *  filtering out wide `string` (e.g. from an UnknownEntity catch-all). */
type TagValues<S, TK extends string> = S extends Record<TK, infer V>
	? string extends V
		? never
		: V
	: never;

/** Prism for a specific variant of a discriminated union (identity form).
 *  The focus type `A` is the narrowed union member itself.
 *
 * ```ts
 * const _circle = match<Shape>()("kind", "circle");
 * // Prism<Shape, { kind: "circle"; radius: number }>
 * ```
 */
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

/** Prism for a specific variant of a discriminated union (with transformation).
 *  Unlike `match`, allows custom `get`/`build` to transform the focus type.
 *
 * ```ts
 * const _circleRadius = matchWith<Shape>()(
 *   "kind", "circle",
 *   (s) => s.radius,
 *   (r) => ({ kind: "circle", radius: r }),
 * );
 * // Prism<Shape, number>
 * ```
 */
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
// Operations (prism flows through the pipe)
// ---------------------------------------------------------------------------

/** Extract the focus from a value, returning Maybe<A>.
 *
 * ```ts
 * pipe(_just<number>(), preview(M.just(42))) // => Just(42)
 * ```
 */
export const preview =
	<S>(s: S) =>
	<A>(prism: Prism<S, A>): Maybe<A> =>
		prism.preview(s);

/** Construct the whole S from the focus A.
 *
 * ```ts
 * pipe(_just<number>(), review(42)) // => Just(42)
 * ```
 */
export const review =
	<A>(a: A) =>
	<S>(prism: Prism<S, A>): S =>
		prism.review(a);

/** Modify the focus (if present) with a function, returning an updater `S => S`.
 * Uses the Prism's `modify` override when available (preserves context),
 * otherwise falls back to `preview → f → review`.
 *
 * ```ts
 * pipe(_just<number>(), over(n => n + 1))(M.just(10)) // => Just(11)
 * ```
 */
export const over =
	<A>(f: (a: A) => A) =>
	<S>(prism: Prism<S, A>) =>
	(s: S): S => {
		if (prism.modify) return prism.modify(f)(s);
		const ma = prism.preview(s);
		if (M.isNothing(ma)) return s;
		return prism.review(f(ma.value));
	};

/** Replace the focus (if present), returning an updater `S => S`.
 *
 * ```ts
 * pipe(_just<number>(), set(99))(M.just(10)) // => Just(99)
 * ```
 */
export const set =
	<A>(a: A) =>
	<S>(prism: Prism<S, A>) =>
	(s: S): S =>
		over<A>(() => a)(prism)(s);

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/** Helper: derive modify from a Prism (uses override when available). */
export const prismModify = <S, A>(prism: Prism<S, A>) =>
	prism.modify ??
	((f: (a: A) => A) =>
		(s: S): S => {
			const ma = prism.preview(s);
			if (M.isNothing(ma)) return s;
			return prism.review(f(ma.value));
		});

/** Unified compose (pipe-friendly, discriminates on to.tag). */
export function compose<A, B>(to: Prism<A, B>): <S>(from: Prism<S, A>) => Prism<S, B>;
export function compose<A, B>(to: Lens<A, B>): <S>(from: Prism<S, A>) => Prism<S, B>;
export function compose<A, B>(to: Traversal<A, B>): <S>(from: Prism<S, A>) => Traversal<S, B>;
export function compose<A, B>(
	to: Prism<A, B> | Lens<A, B> | Traversal<A, B>,
): <S>(from: Prism<S, A>) => Prism<S, B> | Traversal<S, B> {
	return <S>(from: Prism<S, A>) => {
		if (to.tag === "Traversal") {
			const traversal = to as Traversal<A, B>;
			return {
				tag: "Traversal" as const,
				modify: (f: (b: B) => B) => prismModify(from)(traversal.modify(f)),
				toArray: (s: S) => {
					const ma = from.preview(s);
					if (M.isNothing(ma)) return [];
					return traversal.toArray(ma.value);
				},
			};
		}
		if (to.tag === "Lens") {
			const lens = to as Lens<A, B>;
			return {
				tag: "Prism" as const,
				preview: (s: S) => {
					const ma = from.preview(s);
					if (M.isNothing(ma)) return M.nothing();
					return M.just(lens.get(ma.value));
				},
				review: (b: B) => from.review(lens.set(b)({} as A)),
				modify: (f: (b: B) => B) => prismModify(from)((a: A) => lens.set(f(lens.get(a)))(a)),
			};
		}
		// default: Prism + Prism
		const inner = to as Prism<A, B>;
		return {
			tag: "Prism" as const,
			preview: (s: S) => {
				const ma = from.preview(s);
				if (M.isNothing(ma)) return M.nothing();
				return inner.preview(ma.value);
			},
			review: (b: B) => from.review(inner.review(b)),
			modify: (f: (b: B) => B) => prismModify(from)(prismModify(inner)(f)),
		};
	};
}
