import * as M from "@oofp/core/maybe";
import type { Maybe } from "@oofp/core/maybe";
import * as Iso from "../iso";
import * as Lens from "../lens";
import * as Prism from "../prism";
import * as Traversal from "../traversal";
import { URIS } from "../hkt";
import { collect } from "./collect";
import { get } from "./get";
import { modify } from "./modify";
import { Focal } from "./types";

/** Modify the current focus using the value obtained from another focal on the same source S.
 *
 * The type of value passed to `f` depends on the optic kind of `otherFocal`:
 * - **Lens / Iso** → `f` receives `B` directly (always has a value)
 * - **Prism**      → `f` receives `Maybe<B>` (may or may not have a value)
 * - **Traversal**  → `f` receives `B[]` (zero or more values)
 *
 * `f` is currified: `(b: ...) => (a: A) => A`, consistent with the rest of the API.
 *
 * ```ts
 * // Lens/Iso — B directly
 * pipe(Focal.from<Order>(), Focal.prop('discount'),
 *   Focal.modifyWith(totalFocal, total => _discount => total * 0.1),
 * )(myOrder)
 *
 * // Prism — Maybe<B>
 * pipe(Focal.from<Order>(), Focal.prop('label'),
 *   Focal.modifyWith(extraFocal, mb => _label =>
 *     M.isJust(mb) ? mb.value.toUpperCase() : "NONE"
 *   ),
 * )(myOrder)
 *
 * // Traversal — B[]
 * pipe(Focal.from<Order>(), Focal.prop('total'),
 *   Focal.modifyWith(tagsFocal, tags => _total => tags.length),
 * )(myOrder)
 * ```
 */
export function modifyWith<B, S, A>(
	otherFocal: Focal<Lens.URI | Iso.URI, S, B>,
	f: (b: B) => (a: A) => A,
): <F extends URIS>(focal: Focal<F, S, A>) => (s: S) => S;
export function modifyWith<B, S, A>(
	otherFocal: Focal<Prism.URI, S, B>,
	f: (mb: Maybe<B>) => (a: A) => A,
): <F extends URIS>(focal: Focal<F, S, A>) => (s: S) => S;
export function modifyWith<B, S, A>(
	otherFocal: Focal<Traversal.URI, S, B>,
	f: (bs: B[]) => (a: A) => A,
): <F extends URIS>(focal: Focal<F, S, A>) => (s: S) => S;
export function modifyWith<B, S, A>(
	otherFocal: Focal<URIS, S, B>,
	f: ((b: B) => (a: A) => A) | ((mb: Maybe<B>) => (a: A) => A) | ((bs: B[]) => (a: A) => A),
) {
	return <F extends URIS>(focal: Focal<F, S, A>) =>
		(s: S): S => {
			let arg: B | Maybe<B> | B[];
			switch (otherFocal.optic.tag) {
				case "Lens":
				case "Iso":
					arg = get(s)(otherFocal as Focal<Lens.URI, S, B>);
					break;
				case "Prism": {
					const items = collect(s)(otherFocal);
					arg = items.length > 0 ? M.just(items[0]) : M.nothing<B>();
					break;
				}
				case "Traversal":
					arg = collect(s)(otherFocal);
					break;
				default:
					throw new Error("Unsupported optic type");
			}
			return modify<A>((f as (x: typeof arg) => (a: A) => A)(arg))(focal)(s);
		};
}
