import * as Traversal from "../traversal";
import { URIS } from "../hkt";
import { compose } from "./compose";
import { make } from "./internal";
import { Focal } from "./types";

export const elements =
	() =>
	<F extends URIS, S, A>(focal: Focal<F, S, A[]>): Focal<Traversal.URI, S, A> => {
		const eachTraversal = make<Traversal.URI, A[], A>(Traversal.each<A>());
		return compose(eachTraversal)(focal as never) as Focal<Traversal.URI, S, A>;
	};
