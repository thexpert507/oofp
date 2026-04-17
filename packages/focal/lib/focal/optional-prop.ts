import * as Lens from "../lens";
import * as Prism from "../prism";
import * as Traversal from "../traversal";
import type { OptionalKeys } from "../path-types";
import { URIS } from "../hkt";
import { compose } from "./compose";
import { make } from "./internal";
import { Focal } from "./types";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

/**
 * optionalProp composes a Lens (the prop is always "there", its value may be null/undefined).
 * Composing with a Lens preserves the kind of the incoming focal:
 *   Lens      ∘ Lens → Lens
 *   Prism     ∘ Lens → Prism
 *   Iso       ∘ Lens → Lens   (Iso is a sub-kind of Lens in the registry)
 *   Traversal ∘ Lens → Traversal
 */
type OptionalPropResult<F extends URIS, S, A, K extends keyof A> = F extends Traversal.URI
	? Focal<Traversal.URI, S, A[K]>
	: F extends Prism.URI
		? Focal<Prism.URI, S, A[K]>
		: Focal<Lens.URI, S, A[K]>;

// ---------------------------------------------------------------------------
// optionalProp
// ---------------------------------------------------------------------------

/**
 * Focus on a single nullable/optional property of the current focus as a **Lens**.
 *
 * Unlike `optional` (which returns a Prism and strips null/undefined from the focus),
 * `optionalProp` keeps the full `A[K]` type — including `null | undefined` — in focus.
 * This makes `.set(undefined)` and `.set(null)` valid operations.
 *
 * ```ts
 * // activeTab: ActiveTab | undefined
 * pipe(
 *   Focal.from<DomainState>(),
 *   Focal.optionalProp("activeTab"),
 *   Focal.set(undefined),
 * )
 *
 * // Traversal use-case (motivating example):
 * FocalBuilder.from<AppState>()
 *   .eachRecord("domains")
 *   .filter(d => d.activeTab?.tabId === tabId)
 *   .optionalProp("activeTab")
 *   .set(undefined)
 *   .run(state)
 * ```
 */
export function optionalProp<A, K extends OptionalKeys<A> & string>(
	key: K,
): <F extends URIS, S>(focal: Focal<F, S, A>) => OptionalPropResult<F, S, A, K>;
// biome-ignore lint/suspicious/noExplicitAny: implementation overload
export function optionalProp(key: string): (focal: Focal<URIS, any, any>) => Focal<URIS, any, any> {
	// biome-ignore lint/suspicious/noExplicitAny: implementation
	return (focal: Focal<URIS, any, any>) => {
		// biome-ignore lint/suspicious/noExplicitAny: implementation
		const propFn = Lens.optionalProp as (key: string) => (lens: Lens.Lens<any, any>) => Lens.Lens<any, any>;
		// biome-ignore lint/suspicious/noExplicitAny: implementation
		const keyLens = propFn(key)(Lens.identity<any>());
		const keyFocal = make<Lens.URI, unknown, unknown>(keyLens as Lens.Lens<unknown, unknown>);
		// biome-ignore lint/suspicious/noExplicitAny: implementation
		return compose(keyFocal)(focal as any) as any;
	};
}
