import * as Traversal from "../traversal";
import { URIS } from "../hkt";
import { compose } from "./compose";
import { make } from "./internal";
import { Focal } from "./types";

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
