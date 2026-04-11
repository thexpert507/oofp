import * as Prism from "../prism";
import * as Traversal from "../traversal";
import type { NullablePaths, PathValue } from "../path-types";
import { URIS } from "../hkt";
import { compose } from "./compose";
import { make } from "./internal";
import { Focal } from "./types";

type OptionalResult<F extends URIS, S, A, Key extends string> = F extends Traversal.URI
	? Focal<Traversal.URI, S, NonNullable<PathValue<A, Key>>>
	: Focal<Prism.URI, S, NonNullable<PathValue<A, Key>>>;

/**
 * Focus on a nullable/optional property or a deeply nested path that passes through
 * at least one nullable/optional level. Returns a Prism focal.
 *
 * Delegates to `Prism.optional` for the actual optic construction, then composes
 * with the existing focal.
 *
 * ```ts
 * // manager: Person | null
 * pipe(Focal.from<Company>(), Focal.optional("manager.name"), Focal.preview(acme))
 * // => Nothing (if manager is null) | Just("Bob")
 * ```
 */
export const optional =
	<A, const Key extends NullablePaths<A>>(key: Key) =>
	<F extends URIS, S>(focal: Focal<F, S, A>): OptionalResult<F, S, A, Key> => {
		// Build a Prism<A, NonNullable<PathValue<A, Key>>> via Prism.optional
		const pathPrism = Prism.optional<A, Key>(key);
		const pathFocal = make<Prism.URI, unknown, unknown>(pathPrism as Prism.Prism<unknown, unknown>);
		// Compose: Focal<F, S, A> ∘ Focal<Prism, A, B> → Focal<max(F,Prism), S, B>
		return compose(pathFocal)(focal as never) as OptionalResult<F, S, A, Key>;
	};
