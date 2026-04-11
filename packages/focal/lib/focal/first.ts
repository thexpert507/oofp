import * as Prism from "../prism";
import * as Traversal from "../traversal";
import { URIS } from "../hkt";
import { compose } from "./compose";
import { make } from "./internal";
import { Focal } from "./types";

type FirstResult<F extends URIS, S, A> = F extends Traversal.URI
	? Focal<Traversal.URI, S, A>
	: Focal<Prism.URI, S, A>;

/** Focus on the first element of an array that satisfies a predicate.
 *
 * Operates at the structural level — requires the current focus to be `A[]`.
 * Returns a Prism (or Traversal if composing with a Traversal), so the chain
 * can continue with further navigation or termination via `preview`/`modify`/etc.
 *
 * ```ts
 * pipe(
 *   Focal.from<LabState>(),
 *   Focal.prop("backlog"),
 *   Focal.first(item => item.id === id),  // Focal<Prism, LabState, BacklogItem>
 *   Focal.prop("title"),
 *   Focal.preview(state),                 // => Maybe<string>
 * )
 * ```
 */
export const first =
	<A>(pred: (a: A) => boolean) =>
	<F extends URIS, S>(focal: Focal<F, S, A[]>): FirstResult<F, S, A> => {
		const firstPrism = make<Prism.URI, A[], A>(Prism.first<A>(pred));
		return compose(firstPrism)(focal as never) as FirstResult<F, S, A>;
	};
