/**
 * Lens<S, A> — a composable, lawful optic for focusing on a part A within a whole S.
 *
 * Laws:
 *   GetPut:  set(get(s))(s)        ≡ s           — setting what you got changes nothing
 *   PutGet:  get(set(a)(s))        ≡ a           — getting what you set yields what you set
 *   PutPut:  set(b)(set(a)(s))     ≡ set(b)(s)   — setting twice is the same as setting once
 */

import type { Prism } from "./prism.ts";
import { prismModify } from "./prism.ts";
import type { Traversal } from "./traversal.ts";

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export interface Lens<S, A> {
	readonly tag: "Lens";
	readonly get: (s: S) => A;
	readonly set: (a: A) => (s: S) => S;
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

/** Create a Lens from a getter and a setter.
 *
 * ```ts
 * const fstLens = Lens.make(
 *   (pair: [number, string]) => pair[0],
 *   (n: number) => (pair: [number, string]) => [n, pair[1]] as [number, string],
 * );
 * ```
 */
export const make = <S, A>(get: (s: S) => A, set: (a: A) => (s: S) => S): Lens<S, A> => ({
	tag: "Lens",
	get,
	set,
});

/** The identity Lens — focuses on the entire value. Entry point for pipe chains.
 *
 * ```ts
 * const ageLens = pipe(identity<Person>(), prop('age'));
 * ```
 */
export const identity = <A>(): Lens<A, A> => ({
	tag: "Lens",
	get: (a) => a,
	set: (a) => () => a,
});

// ---------------------------------------------------------------------------
// Combinators
// ---------------------------------------------------------------------------

/** Focus on a property of the current focus. All types are inferred.
 *
 * ```ts
 * const streetLens = pipe(
 *   identity<Company>(),
 *   prop('ceo'),
 *   prop('address'),
 *   prop('street'),
 * );
 * ```
 */
export const prop =
	<A, K extends keyof A>(key: K) =>
	<S>(lens: Lens<S, A>): Lens<S, A[K]> => ({
		tag: "Lens",
		get: (s) => lens.get(s)[key],
		set: (v) => (s) => {
			const a = lens.get(s);
			return lens.set({ ...a, [key]: v })(s);
		},
	});

// ---------------------------------------------------------------------------
// Operations (lens flows through the pipe)
// ---------------------------------------------------------------------------

/** Extract the focus from a value.
 *
 * ```ts
 * pipe(identity<Person>(), prop('age'), view(alice)) // => 30
 * ```
 */
export const view =
	<S>(s: S) =>
	<A>(lens: Lens<S, A>): A =>
		lens.get(s);

/** Replace the focus, returning an updater `S => S`.
 *
 * ```ts
 * pipe(identity<Company>(), prop('ceo'), prop('age'), set(31))(acme)
 * ```
 */
export const set =
	<A>(a: A) =>
	<S>(lens: Lens<S, A>) =>
	(s: S): S =>
		lens.set(a)(s);

/** Modify the focus with a function, returning an updater `S => S`.
 *
 * ```ts
 * pipe(identity<Company>(), prop('ceo'), prop('age'), over(n => n + 1))(acme)
 * ```
 */
export const over =
	<A>(f: (a: A) => A) =>
	<S>(lens: Lens<S, A>) =>
	(s: S): S =>
		lens.set(f(lens.get(s)))(s);

// ---------------------------------------------------------------------------
// Composition (pipe-friendly, discriminates on to.tag)
// ---------------------------------------------------------------------------

export function compose<A, B>(to: Lens<A, B>): <S>(from: Lens<S, A>) => Lens<S, B>;
export function compose<A, B>(to: Prism<A, B>): <S>(from: Lens<S, A>) => Prism<S, B>;
export function compose<A, B>(to: Traversal<A, B>): <S>(from: Lens<S, A>) => Traversal<S, B>;
export function compose<A, B>(
	to: Lens<A, B> | Prism<A, B> | Traversal<A, B>,
): <S>(from: Lens<S, A>) => Lens<S, B> | Prism<S, B> | Traversal<S, B> {
	return <S>(from: Lens<S, A>) => {
		if (to.tag === "Prism") {
			const prism = to as Prism<A, B>;
			return {
				tag: "Prism" as const,
				preview: (s: S) => prism.preview(from.get(s)),
				review: (b: B) => from.set(prism.review(b))({} as S),
				modify: (f: (b: B) => B) => (s: S) => {
					const a = from.get(s);
					const newA = prismModify(prism)(f)(a);
					return from.set(newA)(s);
				},
			};
		}
		if (to.tag === "Traversal") {
			const traversal = to as Traversal<A, B>;
			return {
				tag: "Traversal" as const,
				modify: (f: (b: B) => B) => (s: S) => {
					const a = from.get(s);
					const newA = traversal.modify(f)(a);
					return from.set(newA)(s);
				},
				toArray: (s: S) => traversal.toArray(from.get(s)),
			};
		}
		// Lens (default)
		const inner = to as Lens<A, B>;
		return {
			tag: "Lens" as const,
			get: (s: S) => inner.get(from.get(s)),
			set: (b: B) => (s: S) => {
				const a = from.get(s);
				const newA = inner.set(b)(a);
				return from.set(newA)(s);
			},
		};
	};
}
