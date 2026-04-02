import * as L from "@oofp/core/list";
import * as M from "@oofp/core/maybe";
import type { Maybe } from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";
import { Kind, URIS } from "../hkt";
import * as Iso from "../iso";
import * as Lens from "../lens";
import * as Prism from "../prism";
import * as Traversal from "../traversal";
import { ComposeResult, compose } from "./compose";
import { Focal } from "./types";

const call =
	<A>(a: A) =>
	<B>(f: (a: A) => B) =>
		f(a);

const make = <F extends URIS, S, A>(optic: Kind<F, S, A>): Focal<F, S, A> => ({
	tag: "Focal",
	optic,
});

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

export const from = <S>(): Focal<Lens.URI, S, S> => make<Lens.URI, S, S>(Lens.identity<S>());

export const fromEach = <A>(): Focal<Traversal.URI, A[], A> =>
	make<Traversal.URI, A[], A>(Traversal.each<A>());

export function fromOptic<S, A>(optic: Lens.Lens<S, A>): Focal<Lens.URI, S, A>;
export function fromOptic<S, A>(optic: Prism.Prism<S, A>): Focal<Prism.URI, S, A>;
export function fromOptic<S, A>(optic: Iso.Iso<S, A>): Focal<Iso.URI, S, A>;
export function fromOptic<S, A>(optic: Traversal.Traversal<S, A>): Focal<Traversal.URI, S, A>;
export function fromOptic<S, A>(
	optic: Lens.Lens<S, A> | Prism.Prism<S, A> | Iso.Iso<S, A> | Traversal.Traversal<S, A>,
): Focal<URIS, S, A> {
	return make(optic as Kind<URIS, S, A>);
}

export const toOptic = <F extends URIS, S, A>(focal: Focal<F, S, A>): Kind<F, S, A> => focal.optic;

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

type ArrayKeys<A> = {
	[K in keyof A]: A[K] extends unknown[] ? K : never;
}[keyof A];

type ElementOf<A, K extends keyof A> = A[K] extends (infer E)[] ? E : never;

type PropResult<F extends URIS, S, A, K extends keyof A> = F extends Traversal.URI
	? Focal<Traversal.URI, S, A[K]>
	: F extends Prism.URI
		? Focal<Prism.URI, S, A[K]>
		: Focal<Lens.URI, S, A[K]>;

export const prop =
	<A, K extends keyof A>(key: K) =>
	<F extends URIS, S>(focal: Focal<F, S, A>): PropResult<F, S, A, K> => {
		const propLens = make<Lens.URI, A, A[K]>(
			Lens.make(
				(a) => a[key],
				(v) => (a) => ({ ...a, [key]: v }),
			),
		);
		return compose(propLens)(focal as never) as PropResult<F, S, A, K>;
	};

type OptionalKeys<A> = {
	[K in keyof A]: undefined extends A[K] ? K : null extends A[K] ? K : never;
}[keyof A];

type OptionalResult<F extends URIS, S, A, K extends keyof A> = F extends Traversal.URI
	? Focal<Traversal.URI, S, NonNullable<A[K]>>
	: Focal<Prism.URI, S, NonNullable<A[K]>>;

export const optional =
	<A, K extends OptionalKeys<A>>(key: K) =>
	<F extends URIS, S>(focal: Focal<F, S, A>): OptionalResult<F, S, A, K> => {
		const optPrism = make<Prism.URI, A, NonNullable<A[K]>>(
			Prism.make(
				(a) => M.fromNullable(a[key] as NonNullable<A[K]> | null | undefined),
				(_v) => ({}) as A,
				(f) => (a) => {
					const v = a[key];
					if (v === null || v === undefined) return a;
					return { ...a, [key]: f(v as NonNullable<A[K]>) };
				},
			),
		);
		return compose(optPrism)(focal as never) as OptionalResult<F, S, A, K>;
	};

export const filter =
	<A>(pred: (a: A) => boolean) =>
	<F extends URIS, S>(focal: Focal<F, S, A>): Focal<Traversal.URI, S, A> => {
		const guardFocal = make<Traversal.URI, A, A>(
			Traversal.make(
				(f) => (a) => (pred(a) ? f(a) : a),
				(a) => (pred(a) ? [a] : []),
			),
		);
		return compose(guardFocal)(focal as never) as Focal<Traversal.URI, S, A>;
	};

export const each =
	<A, K extends ArrayKeys<A>>(key: K) =>
	<F extends URIS, S>(focal: Focal<F, S, A>): Focal<Traversal.URI, S, ElementOf<A, K>> => {
		const arrFocal = prop<A, K>(key)(focal as never) as Focal<URIS, S, A[K]>;
		const eachTraversal = make<Traversal.URI, A[K], ElementOf<A, K>>(
			Traversal.each<ElementOf<A, K>>() as unknown as Traversal.Traversal<A[K], ElementOf<A, K>>,
		);
		return compose(eachTraversal)(arrFocal as never) as Focal<Traversal.URI, S, ElementOf<A, K>>;
	};

type RecordKeys<A> = {
	[K in keyof A]: A[K] extends Record<string, unknown> ? K : never;
}[keyof A];

type RecordValueOf<A, K extends keyof A> = A[K] extends Record<string, infer V> ? V : never;

export const eachRecord =
	<A, K extends RecordKeys<A>>(key: K) =>
	<F extends URIS, S>(focal: Focal<F, S, A>): Focal<Traversal.URI, S, RecordValueOf<A, K>> => {
		const recFocal = prop<A, K>(key)(focal as never) as Focal<URIS, S, A[K]>;
		const eachValTraversal = make<Traversal.URI, A[K], RecordValueOf<A, K>>(
			Traversal.eachValue<RecordValueOf<A, K>>() as unknown as Traversal.Traversal<
				A[K],
				RecordValueOf<A, K>
			>,
		);
		return compose(eachValTraversal)(recFocal as never) as Focal<
			Traversal.URI,
			S,
			RecordValueOf<A, K>
		>;
	};

export const index =
	(i: number) =>
	<F extends URIS, S, A>(focal: Focal<F, S, A[]>): ComposeResult<Prism.URI, F, S, A> => {
		const idxPrism = make<Prism.URI, A[], A>(Prism.index<A>(i));
		return compose(idxPrism)(focal as never) as ComposeResult<Prism.URI, F, S, A>;
	};

export const indexRecord =
	(key: string) =>
	<F extends URIS, S, A>(
		focal: Focal<F, S, Record<string, A>>,
	): ComposeResult<Prism.URI, F, S, A> => {
		const recPrism = make<Prism.URI, Record<string, A>, A>(Prism.indexRecord<A>(key));
		return compose(recPrism)(focal as never) as ComposeResult<Prism.URI, F, S, A>;
	};

export const elements =
	() =>
	<F extends URIS, S, A>(focal: Focal<F, S, A[]>): Focal<Traversal.URI, S, A> => {
		const eachTraversal = make<Traversal.URI, A[], A>(Traversal.each<A>());
		return compose(eachTraversal)(focal as never) as Focal<Traversal.URI, S, A>;
	};

// Overload 1: with explicit type param — curried tagKey then tagValue, enabling partial matchers.
// The two-step currying ensures TV is fully instantiated before Extract<A, Record<TK, TV>> is
// evaluated, preventing TypeScript from widening TV to its upper bound when A contains
// index-signature members (e.g. catch-all union variants like { [key: string]: unknown }).
//
// Usage — inline:
//   Focal.match<Shape>()("kind")("circle")
//
// Usage — partial matcher (the main benefit):
//   const byKind = Focal.match<Shape>()("kind");
//   pipe(focal, byKind("circle"))
//   pipe(focal, byKind("rect"))
export function match<A>(): <TK extends keyof Prism.StripIndex<A> & string>(
	tagKey: TK,
) => <TV extends Prism.TagValues<A, TK>>(
	tagValue: TV,
) => <F extends URIS, S>(
	focal: Focal<F, S, A>,
) => ComposeResult<Prism.URI, F, S, Extract<A, Record<TK, TV>>>;

// Overload 2: without type param — A inferred from the focal in the pipe.
// Both arguments taken together for convenient inline use.
export function match<TK extends string, TV extends string>(
	tagKey: TK,
	tagValue: TV,
): <F extends URIS, S, A>(
	focal: Focal<F, S, A>,
) => ComposeResult<Prism.URI, F, S, Extract<A, Record<TK, TV>>>;

// Implementation
export function match(...args: [] | [string, string]): unknown {
	const impl = (tagKey: string, tagValue: string) => (focal: Focal<URIS, never, never>) => {
		const matchPrism = make<Prism.URI, never, never>(
			Prism.match<never>()(tagKey as never, tagValue as never),
		);
		return compose(matchPrism)(focal as never);
	};
	if (args.length === 0) return (tagKey: string) => (tagValue: string) => impl(tagKey, tagValue);
	return impl(args[0], args[1]);
}

// ---------------------------------------------------------------------------
// Data-last terminators
// ---------------------------------------------------------------------------

export const modify =
	<A>(f: (a: A) => A) =>
	<F extends URIS, S>(focal: Focal<F, S, A>) =>
	(s: S): S => {
		const optic = focal.optic;
		switch (optic.tag) {
			case "Lens":
				return pipe(optic as Lens.Lens<S, A>, Lens.modify(f), call(s));
			case "Prism":
				return pipe(optic as Prism.Prism<S, A>, Prism.modify(f), call(s));
			case "Iso":
				return pipe(optic as Iso.Iso<S, A>, Iso.modify(f), call(s));
			case "Traversal":
				return pipe(optic as Traversal.Traversal<S, A>, Traversal.modify(f), call(s));
			default:
				throw new Error("Unsupported optic type");
		}
	};

export const set =
	<A>(a: A) =>
	<F extends URIS, S>(focal: Focal<F, S, A>) =>
	(s: S): S =>
		pipe(
			focal,
			modify(() => a),
			call(s),
		);

export const fold =
	<B, A>(init: B, f: (acc: B, a: A) => B) =>
	<F extends URIS, S>(focal: Focal<F, S, A>) =>
	(s: S): B =>
		collect(s)(focal).reduce(f, init);

// ---------------------------------------------------------------------------
// Data-first terminators
// ---------------------------------------------------------------------------

export const get =
	<S>(s: S) =>
	<A>(focal: Focal<Lens.URI | Iso.URI, S, A>): A => {
		const optic = focal.optic;
		if (optic.tag === "Lens") return (optic as Lens.Lens<S, A>).get(s);
		return (optic as Iso.Iso<S, A>).to(s);
	};

export const preview =
	<S>(s: S) =>
	<A>(focal: Focal<Prism.URI, S, A>): Maybe<A> =>
		(focal.optic as Prism.Prism<S, A>).preview(s);

export const collect =
	<S>(s: S) =>
	<F extends URIS, A>(focal: Focal<F, S, A>): A[] => {
		switch (focal.optic.tag) {
			case "Lens":
				return [pipe(focal.optic as Lens.Lens<S, A>, Lens.view(s))];
			case "Prism":
				return pipe(
					focal.optic as Prism.Prism<S, A>,
					Prism.preview(s),
					M.map((a) => [a]),
					M.getOrElse([] as A[]),
				);
			case "Iso":
				return [pipe(focal.optic as Iso.Iso<S, A>, Iso.view(s))];
			case "Traversal":
				return pipe(focal.optic as Traversal.Traversal<S, A>, Traversal.collect(s));
			default:
				throw new Error("Unsupported optic type");
		}
	};

export const has =
	<S>(s: S) =>
	<F extends URIS, A>(focal: Focal<F, S, A>): boolean =>
		pipe(focal, collect(s), (n) => n.length > 0);

export const count =
	<S>(s: S) =>
	<F extends URIS, A>(focal: Focal<F, S, A>): number =>
		pipe(focal, collect(s), L.size);

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

export const run =
	<S>(s: S) =>
	<T>(updater: (s: S) => T): T =>
		updater(s);
