import * as Prism from "../prism";
import * as Traversal from "../traversal";
import { URIS } from "../hkt";
import { compose } from "./compose";
import { make } from "./internal";
import { Focal } from "./types";

type IndexRecordResult<F extends URIS, S, A> = F extends Traversal.URI
	? Focal<Traversal.URI, S, A>
	: Focal<Prism.URI, S, A>;

export const indexRecord =
	(key: string) =>
	<F extends URIS, S, A>(
		focal: Focal<F, S, Record<string, A>>,
	): IndexRecordResult<F, S, A> => {
		const recPrism = make<Prism.URI, Record<string, A>, A>(Prism.indexRecord<A>(key));
		return compose(recPrism)(focal as never) as IndexRecordResult<F, S, A>;
	};
