import * as Lens from "../lens";
import * as Traversal from "../traversal";
import { URIS } from "../hkt";
import { compose } from "./compose";
import { make } from "./internal";
import { Focal } from "./types";

type ArrayKeys<A> = {
	[K in keyof A]: A[K] extends unknown[] ? K : never;
}[keyof A];

type ElementOf<A, K extends keyof A> = A[K] extends (infer E)[] ? E : never;

export const each =
	<A, K extends ArrayKeys<A>>(key: K) =>
	<F extends URIS, S>(focal: Focal<F, S, A>): Focal<Traversal.URI, S, ElementOf<A, K>> => {
		const propLens = make<Lens.URI, A, A[K]>(
			Lens.make(
				(a) => a[key],
				(v) => (a) => ({ ...a, [key]: v }),
			),
		);
		const arrFocal = compose(propLens)(focal as never) as Focal<URIS, S, A[K]>;
		const eachTraversal = make<Traversal.URI, A[K], ElementOf<A, K>>(
			Traversal.each<ElementOf<A, K>>() as unknown as Traversal.Traversal<A[K], ElementOf<A, K>>,
		);
		return compose(eachTraversal)(arrFocal as never) as Focal<Traversal.URI, S, ElementOf<A, K>>;
	};
