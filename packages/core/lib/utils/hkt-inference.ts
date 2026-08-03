/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import type { Kind2, URIS2 } from "@/URIS2";
import type { Kind3, URIS3 } from "@/URIS3";

type IsAny<T> = 0 extends 1 & T ? true : false;

export type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (
	value: infer I,
) => void
	? I
	: never;

export type Kind2Parts<F extends URIS2, T> = T extends Kind2<F, infer E, infer A> ? [E, A] : never;

export type Kind3Parts<F extends URIS3, T> = T extends Kind3<F, infer R, infer E, infer A>
	? [R, E, A]
	: never;

export type EnsureKinds2<F extends URIS2, Args extends readonly unknown[]> = {
	[K in keyof Args]: IsAny<Args[K]> extends true
		? never
		: Args[K] extends Kind2<F, infer _E, infer _A>
			? Args[K]
			: never;
};

export type EnsureKinds3<F extends URIS3, Args extends readonly unknown[]> = {
	[K in keyof Args]: IsAny<Args[K]> extends true
		? never
		: Args[K] extends Kind3<F, infer _R, infer _E, infer _A>
			? Args[K]
			: never;
};

export type EnsureKind2Record<F extends URIS2, Args extends Record<string, unknown>> = {
	[K in keyof Args]: IsAny<Args[K]> extends true
		? never
		: Args[K] extends Kind2<F, infer _E, infer _A>
			? Args[K]
			: never;
};

export type EnsureKind3Record<F extends URIS3, Args extends Record<string, unknown>> = {
	[K in keyof Args]: IsAny<Args[K]> extends true
		? never
		: Args[K] extends Kind3<F, infer _R, infer _E, infer _A>
			? Args[K]
			: never;
};
