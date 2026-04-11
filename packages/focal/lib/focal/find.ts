import * as M from "@oofp/core/maybe";
import type { Maybe } from "@oofp/core/maybe";
import { URIS } from "../hkt";
import { collect } from "./collect";
import { Focal } from "./types";

/** Find the first focus that satisfies a predicate, returning Maybe<A>.
 *
 * ```ts
 * pipe(
 *   Focal.from<Order>(),
 *   Focal.prop('items'),
 *   Focal.elements(),
 *   Focal.find(item => item.price > 100),
 * )(myOrder) // => Maybe<Item>
 * ```
 */
export const find =
	<A>(pred: (a: A) => boolean) =>
	<F extends URIS, S>(focal: Focal<F, S, A>) =>
	(s: S): Maybe<A> => {
		const items = collect(s)(focal);
		const found = items.find(pred);
		return found !== undefined ? M.just(found) : M.nothing();
	};
