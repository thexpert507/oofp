import * as M from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";
import type { Iso } from "./iso";
import * as I from "./iso";
import type { Lens } from "./lens";
import * as L from "./lens";
import type { Prism } from "./prism";
import * as P from "./prism";
import type { Traversal } from "./traversal";
import * as T from "./traversal";

/**
 *  *   from \ to  | Iso       | Lens      | Prism     | Traversal
 *   -----------|-----------|-----------|-----------|----------
 *   Iso        | Iso       | Lens      | Prism     | Traversal
 *   Lens       | Lens      | Lens      | Prism     | Traversal
 *   Prism      | Prism     | Prism     | Prism     | Traversal
 *   Traversal  | Traversal | Traversal | Traversal | Traversal
 */

type AnyOptic<A, B> = Iso<A, B> | Lens<A, B> | Prism<A, B> | Traversal<A, B>;

// ---------------------------------------------------------------------------
// Iso composition (from Iso to any optic)
// ---------------------------------------------------------------------------
function isoCompose<B, C>(optic: AnyOptic<B, C>): <A>(from: Iso<A, B>) => AnyOptic<A, C> {
	return <A>(from: Iso<A, B>) => {
		switch (optic.tag) {
			case "Iso": {
				return I.make<A, C>(
					(a) => optic.to(from.to(a)),
					(c) => from.from(optic.from(c)),
				);
			}
			case "Lens": {
				return L.make<A, C>(
					(a) => optic.get(from.to(a)),
					(c) => (a) => from.from(optic.set(c)(from.to(a))),
				);
			}
			case "Prism": {
				return P.make<A, C>(
					(a) => optic.preview(from.to(a)),
					(c) => from.from(optic.review(c)),
				);
			}
			case "Traversal": {
				return T.make<A, C>(
					(f) => (a) => from.from(optic.modify(f)(from.to(a))),
					(a) => optic.toArray(from.to(a)),
				);
			}
			default:
				throw new Error(`Unknown optic tag: ${optic["tag"]}`);
		}
	};
}

// ---------------------------------------------------------------------------
// Lens composition (from Lens to Lens/Prism/Traversal)
// ---------------------------------------------------------------------------

function lensCompose<B, C>(optic: AnyOptic<B, C>): <S>(from: Lens<S, B>) => AnyOptic<S, C> {
	return <S>(from: Lens<S, B>) => {
		switch (optic.tag) {
			case "Iso": {
				return L.make<S, C>(
					(s) => optic.to(from.get(s)),
					(c) => (s) => from.set(optic.from(c))(s),
				);
			}
			case "Lens": {
				return L.make<S, C>(
					(s) => optic.get(from.get(s)),
					(c) => (s) => from.set(optic.set(c)(from.get(s)))(s),
				);
			}
			case "Prism": {
				return P.make<S, C>(
					(s) => optic.preview(from.get(s)),
					(c) => from.set(optic.review(c))({} as S),
					(f) => (s) => from.set(P.modify(f)(optic)(from.get(s)))(s),
				);
			}
			case "Traversal": {
				return T.make<S, C>(
					(f) => (s) => from.set(optic.modify(f)(from.get(s)))(s),
					(s) => optic.toArray(from.get(s)),
				);
			}
			default:
				throw new Error(`Unknown optic tag: ${optic["tag"]}`);
		}
	};
}

// ---------------------------------------------------------------------------
// Prism composition (from Prism to Prism/Traversal)
// ---------------------------------------------------------------------------
function prismCompose<B, C>(optic: AnyOptic<B, C>): <S>(from: Prism<S, B>) => AnyOptic<S, C> {
	return <S>(from: Prism<S, B>) => {
		switch (optic.tag) {
			case "Iso": {
				return P.make<S, C>(
					(s) => pipe(from.preview(s), M.map(optic.to)),
					(c) => from.review(optic.from(c)),
				);
			}
			case "Lens": {
				return P.make<S, C>(
					(s) => pipe(from.preview(s), M.map(optic.get)),
					(c) => from.review(optic.set(c)({} as B)),
					(f) => (s) => {
						if (from.modify) return from.modify((b) => optic.set(f(optic.get(b)))(b))(s);
						const mb = from.preview(s);
						if (M.isNothing(mb)) return s;
						return from.review(optic.set(f(optic.get(mb.value)))(mb.value));
					},
				);
			}
			case "Prism": {
				return P.make<S, C>(
					(s) => pipe(from.preview(s), M.chain(optic.preview)),
					(c) => from.review(optic.review(c)),
					(f) => (s) => {
						if (from.modify) return from.modify(P.modify(f)(optic))(s);
						const mb = from.preview(s);
						if (M.isNothing(mb)) return s;
						return from.review(P.modify(f)(optic)(mb.value));
					},
				);
			}
			case "Traversal": {
				return T.make<S, C>(
					(f) => (s) => {
						if (from.modify) return from.modify(optic.modify(f))(s);
						return pipe(
							from.preview(s),
							M.map(optic.modify(f)),
							M.map(from.review),
							M.getOrElse(s),
						);
					},
					(s) => pipe(from.preview(s), M.map(optic.toArray), M.getOrElse([] as C[])),
				);
			}
			default:
				throw new Error(`Unknown optic tag: ${optic["tag"]}`);
		}
	};
}

// ---------------------------------------------------------------------------
// Traversal composition (from Traversal to Traversal)
// ---------------------------------------------------------------------------
function traversalCompose<B, C>(
	optic: AnyOptic<B, C>,
): <S>(from: Traversal<S, B>) => Traversal<S, C> {
	return <S>(from: Traversal<S, B>) => {
		switch (optic.tag) {
			case "Iso": {
				return T.make<S, C>(
					(f) => (s) => from.modify((b) => optic.from(f(optic.to(b))))(s),
					(s) => from.toArray(s).map(optic.to),
				);
			}
			case "Lens": {
				return T.make<S, C>(
					(f) => (s) => from.modify((b) => optic.set(f(optic.get(b)))(b))(s),
					(s) => from.toArray(s).map(optic.get),
				);
			}
			case "Prism": {
				return T.make<S, C>(
					(f) => (s) => from.modify(P.modify(f)(optic))(s),
					(s) => {
						const result: C[] = [];
						for (const b of from.toArray(s)) {
							const mb = optic.preview(b);
							if (M.isJust(mb)) result.push(mb.value);
						}
						return result;
					},
				);
			}
			case "Traversal": {
				return T.make<S, C>(
					(f) => (s) => from.modify((b) => optic.modify(f)(b))(s),
					(s) => {
						const result: C[] = [];
						for (const b of from.toArray(s)) {
							for (const c of optic.toArray(b)) {
								result.push(c);
							}
						}
						return result;
					},
				);
			}
			default:
				throw new Error(`Unknown optic tag: ${optic["tag"]}`);
		}
	};
}

// ---------------------------------------------------------------------------
// Main compose function
// ---------------------------------------------------------------------------

export function compose<A, B>(
	to: Iso<A, B>,
): {
	<S>(from: Iso<S, A>): Iso<S, B>;
	<S>(from: Lens<S, A>): Lens<S, B>;
	<S>(from: Prism<S, A>): Prism<S, B>;
	<S>(from: Traversal<S, A>): Traversal<S, B>;
};
export function compose<A, B>(
	to: Lens<A, B>,
): {
	<S>(from: Iso<S, A>): Lens<S, B>;
	<S>(from: Lens<S, A>): Lens<S, B>;
	<S>(from: Prism<S, A>): Prism<S, B>;
	<S>(from: Traversal<S, A>): Traversal<S, B>;
};
export function compose<A, B>(
	to: Prism<A, B>,
): {
	<S>(from: Iso<S, A>): Prism<S, B>;
	<S>(from: Lens<S, A>): Prism<S, B>;
	<S>(from: Prism<S, A>): Prism<S, B>;
	<S>(from: Traversal<S, A>): Traversal<S, B>;
};
export function compose<A, B>(
	to: Traversal<A, B>,
): {
	<S>(from: Iso<S, A>): Traversal<S, B>;
	<S>(from: Lens<S, A>): Traversal<S, B>;
	<S>(from: Prism<S, A>): Traversal<S, B>;
	<S>(from: Traversal<S, A>): Traversal<S, B>;
};
export function compose<A, B>(input: unknown): unknown {
	const to = input as AnyOptic<A, B>;
	return (from: unknown) => {
		const tag = (from as { tag: string }).tag;
		switch (tag) {
			case "Iso":
				return isoCompose(to)(from as Iso<unknown, A>);
			case "Lens":
				return lensCompose(to)(from as Lens<unknown, A>);
			case "Prism":
				return prismCompose(to)(from as Prism<unknown, A>);
			case "Traversal":
				return traversalCompose(to)(from as Traversal<unknown, A>);
			default:
				throw new Error(`Unknown optic tag: ${tag}`);
		}
	};
}
