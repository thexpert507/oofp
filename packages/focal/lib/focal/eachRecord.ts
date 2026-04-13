import * as Lens from "../lens";
import * as Traversal from "../traversal";
import { URIS } from "../hkt";
import { compose } from "./compose";
import { make } from "./internal";
import { Focal } from "./types";

export type RecordKeys<A> = {
	[K in keyof A]: A[K] extends Record<string, unknown> ? K : never;
}[keyof A];

type RecordValueOf<A, K extends keyof A> = A[K] extends Record<string, infer V> ? V : never;

export const eachRecord =
	<A, K extends RecordKeys<A>>(key: K) =>
	<F extends URIS, S>(focal: Focal<F, S, A>): Focal<Traversal.URI, S, RecordValueOf<A, K>> => {
		const propLens = make<Lens.URI, A, A[K]>(
			Lens.make(
				(a) => a[key],
				(v) => (a) => ({ ...a, [key]: v }),
			),
		);
		const recFocal = compose(propLens)(focal as never) as Focal<URIS, S, A[K]>;
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
