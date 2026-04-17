/**
 * Shared type utilities for dot-notation path navigation.
 *
 * Used by Lens (prop), Prism (optional), and the Focal layer.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Keys of T whose value is never null nor undefined. */
type RequiredKeys<T> = {
	[K in keyof T]: null extends T[K] ? never : undefined extends T[K] ? never : K;
}[keyof T];

/** Keys of T whose value includes null or undefined. */
type NullableKeys<T> = {
	[K in keyof T]: null extends T[K] ? K : undefined extends T[K] ? K : never;
}[keyof T];

/**
 * Keys of T whose value includes `null` or `undefined`.
 *
 * Used as the constraint for `optionalProp(key)` — focusing on a nullable/optional
 * property as a `Lens` (the focus is `T[K]` including the null/undefined, not stripped).
 *
 * @example
 * type K = OptionalKeys<{ name: string; tag: string | undefined; ref: number | null }>;
 * // "tag" | "ref"
 */
export type OptionalKeys<T> = NullableKeys<T>;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Union of all valid dot-notation paths through T where every level is
 * always present (non-nullable, non-undefined).
 *
 * Used as the constraint for `prop("a.b.c")`.
 *
 * @example
 * type P = SafePaths<{ ceo: { name: string }; manager: Person | null }>;
 * // "ceo" | "ceo.name"   (manager excluded — it's nullable)
 */
export type SafePaths<T> = T extends object
	? {
			[K in RequiredKeys<T> & string]: `${K}` | `${K}.${SafePaths<T[K]>}`;
		}[RequiredKeys<T> & string]
	: never;

/**
 * Union of all valid dot-notation paths through T (nullable and required alike).
 *
 * Used internally to generate sub-paths under nullable levels.
 */
export type AllPaths<T> = T extends object
	? {
			[K in keyof T & string]: `${K}` | `${K}.${AllPaths<NonNullable<T[K]>>}`;
		}[keyof T & string]
	: never;

/**
 * Union of all dot-notation paths that begin with at least one nullable/optional key,
 * including deeper paths through those nullable levels.
 *
 * Used as the constraint for `optional("manager.name")`.
 *
 * @example
 * type P = NullablePaths<{ name: string; manager: Person | null }>;
 * // "manager" | "manager.name" | "manager.age" | ...
 */
export type NullablePaths<T> = T extends object
	? {
			[K in NullableKeys<T> & string]: `${K}` | `${K}.${AllPaths<NonNullable<T[K]>>}`;
		}[NullableKeys<T> & string]
	: never;

/**
 * Resolves the value type at the end of a dot-notation path string.
 * Uses NonNullable at each intermediate step so paths through nullable
 * fields (e.g. `manager: Person | null`) resolve correctly.
 *
 * @example
 * type V = PathValue<Company, "ceo.address.street">; // string
 * type W = PathValue<Company, "manager.name">;       // string (manager: Person | null)
 */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
	? K extends keyof T
		? PathValue<NonNullable<T[K]>, Rest>
		: never
	: P extends keyof T
		? T[P]
		: never;
