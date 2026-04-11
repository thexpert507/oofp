import * as Lens from "../lens";
import * as Prism from "../prism";
import * as Traversal from "../traversal";
import type { PathValue, SafePaths } from "../path-types";
import { URIS } from "../hkt";
import { compose } from "./compose";
import { make } from "./internal";
import { Focal } from "./types";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

/** Path result — resolves via PathValue, kind unchanged. */
type PropResult<F extends URIS, S, A, Key extends string> = F extends Traversal.URI
	? Focal<Traversal.URI, S, PathValue<A, Key>>
	: F extends Prism.URI
		? Focal<Prism.URI, S, PathValue<A, Key>>
		: Focal<Lens.URI, S, PathValue<A, Key>>;

// ---------------------------------------------------------------------------
// prop
// ---------------------------------------------------------------------------

/**
 * Focus on a property or a deeply nested property of the current focus.
 * All levels must be always present (non-nullable). For nullable levels use `optional`.
 *
 * TypeScript provides autocomplete for all valid paths.
 *
 * ```ts
 * pipe(Focal.from<Company>(), Focal.prop("ceo.address.street"), Focal.get(acme))
 * // => "123 Main St"
 * ```
 */
export function prop<A, const Key extends SafePaths<A>>(
	key: Key,
): <F extends URIS, S>(focal: Focal<F, S, A>) => PropResult<F, S, A, Key>;
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function prop(key: string): (focal: Focal<URIS, any, any>) => Focal<URIS, any, any> {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	return (focal: Focal<URIS, any, any>) => {
		// Build a Lens<A, B> for the full path via Lens.prop, starting from Lens.identity
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const propFn = Lens.prop as (key: string) => (lens: Lens.Lens<any, any>) => Lens.Lens<any, any>;
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const pathLens = propFn(key)(Lens.identity<any>());
		const pathFocal = make<Lens.URI, unknown, unknown>(pathLens as Lens.Lens<unknown, unknown>);
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return compose(pathFocal)(focal as any) as any;
	};
}
