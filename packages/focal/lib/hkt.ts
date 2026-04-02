/**
 * HKT — Higher-Kinded Types for the focal package.
 *
 * Provides a lightweight defunctionalization registry that maps optic URIs
 * to their concrete two-parameter types `Kind<F, S, A>`.
 *
 * Each optic self-registers via `declare module` augmentation in its own
 * file — the same pattern used by monads in `@oofp/core`:
 *
 * ```ts
 * // In my-optic.ts:
 * export const URI = "MyOptic";
 * export type URI = typeof URI;
 *
 * declare module "./hkt.ts" {
 *   interface URItoKind<S, A> {
 *     MyOptic: MyOptic<S, A>;
 *   }
 * }
 * ```
 */

// ---------------------------------------------------------------------------
// Registry — open interface, each optic self-registers via declare module
// ---------------------------------------------------------------------------

// biome-ignore lint/correctness/noUnusedVariables: <explanation>
export interface URItoKind<S, A> {}

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

/** Union of all registered optic URIs. */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type URIS = keyof URItoKind<any, any>;

/** Resolve a URI to its concrete optic type. */
export type Kind<F extends URIS, S, A> = URItoKind<S, A>[F];
