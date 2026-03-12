/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { ProFunctor } from "./profunctor.ts";

export const URI = "Fn";
export type URI = typeof URI;

export type Fn<A = unknown, B = unknown> = (a: A) => B;

declare module "./URIS2" {
	interface URItoKind2<E, A> {
		Fn: Fn<E, A>;
	}
}
export type Fn2<A = unknown, B = unknown, C = unknown> = (a: A) => (b: B) => C;
export type Fn3<A = unknown, B = unknown, C = unknown, D = unknown> = (
	a: A,
) => (b: B) => (c: C) => D;

export type Predicate<T = unknown> = Fn<T, boolean>;

export const lmap =
	<A, B, C>(f: Fn<C, A>) =>
	(fn: Fn<A, B>): Fn<C, B> =>
	(c: C) =>
		fn(f(c));

export const rmap =
	<A, B, D>(f: Fn<B, D>) =>
	(fn: Fn<A, B>): Fn<A, D> =>
	(a: A) =>
		f(fn(a));

export const dimap =
	<A, B, C, D>(f1: Fn<C, A>, f2: Fn<B, D>) =>
	(fn: Fn<A, B>): Fn<C, D> =>
	(c: C) =>
		f2(fn(f1(c)));

export const FnUtils = { lmap, rmap, dimap } satisfies ProFunctor<"Fn">;
