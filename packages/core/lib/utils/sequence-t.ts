/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind, URIS } from "@/URIS";
import { Kind2, URIS2 } from "@/URIS2";
import { Kind3, URIS3 } from "@/URIS3";
import { Applicative } from "@/applicative";
import { Applicative2 } from "@/applicative";
import { Applicative3 } from "@/applicative";
import { Monad } from "@/monad";
import { Monad2 } from "@/monad";
import { Monad3 } from "@/monad";
import type { UnionToIntersection } from "./hkt-inference";

// Definimos el tipo de la instancia de la mónada, que tiene tanto `Monad` como `Applicative`.
type Instance<F extends URIS> = Monad<F> & Applicative<F>;
type Instance2<F extends URIS2> = Monad2<F> & Applicative2<F>;
type Instance3<F extends URIS3> = Monad3<F> & Applicative3<F>;

type RuntimeMonad = {
	of: (value: unknown) => unknown;
	map: (fn: (value: unknown) => unknown) => (value: unknown) => unknown;
	chain: (fn: (value: unknown) => unknown) => (value: unknown) => unknown;
};

// Tipo para los valores que contiene cada mónada, como un array de `Kind<F, A>`
type ValueOfKind<F extends URIS, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind<F, infer A> ? A : never;
};

type ValueOfKind2<F extends URIS2, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind2<F, infer _E, infer A> ? A : never;
};

type ValueOfKind3<F extends URIS3, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind3<F, infer _R, infer _E, infer A> ? A : never;
};

type Errors2<F extends URIS2, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind2<F, infer E, infer _A> ? E : never;
};

type Contexts3<F extends URIS3, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind3<F, infer R, infer _E, infer _A> ? R : never;
};

type Errors3<F extends URIS3, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind3<F, infer _R, infer E, infer _A> ? E : never;
};

type InferE<F extends URIS2, Args extends unknown[]> = Errors2<F, Args>[number];

type InferR<F extends URIS3, Args extends unknown[]> = UnionToIntersection<
	Contexts3<F, Args>[number]
>;

type InferE3<F extends URIS3, Args extends unknown[]> = Errors3<F, Args>[number];

// `sequenceT` que toma una instancia de la mónada y un array de mónadas, y devuelve una mónada con el tipo de los resultados combinados
export function sequenceT<F extends URIS>(
	mo: Instance<F>,
): <const Args extends unknown[]>(args: Args) => Kind<F, ValueOfKind<F, Args>>;
export function sequenceT<F extends URIS2>(
	mo: Instance2<F>,
): <const Args extends unknown[]>(args: Args) => Kind2<F, InferE<F, Args>, ValueOfKind2<F, Args>>;
export function sequenceT<F extends URIS3>(
	mo: Instance3<F>,
): <const Args extends unknown[]>(
	args: Args,
) => Kind3<F, InferR<F, Args>, InferE3<F, Args>, ValueOfKind3<F, Args>>;

export function sequenceT(mo: unknown) {
	const runtime = mo as RuntimeMonad;

	return (args: unknown[]) => {
		const merge = (result: unknown) => (values: unknown) => [...(values as unknown[]), result];

		return args.reduce(
			(acc, curr) =>
				runtime.chain((values) => runtime.map((result) => merge(result)(values))(curr))(acc),
			runtime.of([]),
		);
	};
}
