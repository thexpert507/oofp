/**
 * Lens<S, A> — a composable, lawful optic for focusing on a part A within a whole S.
 *
 * Laws:
 *   GetPut:  set(get(s))(s)        ≡ s           — setting what you got changes nothing
 *   PutGet:  get(set(a)(s))        ≡ a           — getting what you set yields what you set
 *   PutPut:  set(b)(set(a)(s))     ≡ set(b)(s)   — setting twice is the same as setting once
 */

// ---------------------------------------------------------------------------
// URI — self-registration in the HKT registry
// ---------------------------------------------------------------------------

export const URI = "Lens";
export type URI = typeof URI;

declare module "./hkt.ts" {
	interface URItoKind<S, A> {
		Lens: Lens<S, A>;
	}
}

// ---------------------------------------------------------------------------
// Type — minimal data, no embedded behaviour
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
		set: (v) => (s) => lens.set({ ...lens.get(s), [key]: v })(s),
	});

// ---------------------------------------------------------------------------
// Operations — free functions, all logic lives here
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
 * pipe(identity<Company>(), prop('ceo'), prop('age'), modify(n => n + 1))(acme)
 * ```
 */
export const modify =
	<A>(f: (a: A) => A) =>
	<S>(lens: Lens<S, A>) =>
	(s: S): S =>
		lens.set(f(lens.get(s)))(s);
