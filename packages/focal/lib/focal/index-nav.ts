import * as Prism from "../prism";
import * as Traversal from "../traversal";
import { URIS } from "../hkt";
import { compose } from "./compose";
import { make } from "./internal";
import { Focal } from "./types";

type IndexResult<F extends URIS, S, A> = F extends Traversal.URI
	? Focal<Traversal.URI, S, A>
	: Focal<Prism.URI, S, A>;

export const index =
	(i: number) =>
	<F extends URIS, S, A>(focal: Focal<F, S, A[]>): IndexResult<F, S, A> => {
		const idxPrism = make<Prism.URI, A[], A>(Prism.index<A>(i));
		return compose(idxPrism)(focal as never) as IndexResult<F, S, A>;
	};
