/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind2, URIS2 } from "@/URIS2";
import { Applicative2 } from "@/applicative";
import * as L from "@/list";
import { Monad2 } from "@/monad";
import { pipe } from "@/pipe";
import type { EnsureKinds2 } from "./hkt-inference";

// Definimos el tipo de la instancia de la mónada, que tiene tanto `Monad` como `Applicative`.
type Instance<F extends URIS2> = Monad2<F> & Applicative2<F>;

// Tipo para los valores que contiene cada mónada, como un array de `Kind<F, A>`
type VOK<F extends URIS2, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind2<F, infer _E, infer A> ? A : never;
};

// Extrae y une todos los tipos de error E1 | E2 | E3 | ...
type Errors<F extends URIS2, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind2<F, infer E, infer _A> ? E : never;
};
type UnionE<F extends URIS2, Args extends unknown[]> = Errors<F, Args>[number];

type Result<F extends URIS2, E, Args extends unknown[]> = Kind2<F, E, VOK<F, Args>>;

/**
 * Secuencia un array/tupla de mónadas Kind2.
 * TypeScript infiere automáticamente el tipo de error:
 * - Si todos tienen el mismo tipo E → resultado tiene tipo E
 * - Si tienen diferentes tipos → resultado tiene tipo E1 | E2 | E3 | ...
 *
 * @example
 * ```typescript
 * import * as E from './either'
 * import { sequenceT2 } from './utils'
 *
 * // Mismo tipo de error
 * const result1 = sequenceT2(E)([
 *   E.right<string, number>(1),
 *   E.right<string, string>('hello'),
 *   E.right<string, boolean>(true)
 * ])
 * // Either<string, [number, string, boolean]>
 *
 * // Diferentes tipos de error (union automática)
 * const result2 = sequenceT2(E)([
 *   E.right<string, number>(1),
 *   E.right<boolean, string>('hello'),
 *   E.right<Error, boolean>(true)
 * ])
 * // Either<string | boolean | Error, [number, string, boolean]>
 * ```
 */
export const sequenceT2 =
	<F extends URIS2>(mo: Instance<F>) =>
	<const Args extends unknown[]>(
		args: Args,
		..._validation: Args extends EnsureKinds2<F, Args> ? [] : [invalid: never]
	): Result<F, UnionE<F, Args>, Args> => {
		type E = UnionE<F, Args>;
		type Values = VOK<F, Args>;

		const initial = mo.of<E, Values>([] as unknown as Values);

		const merge =
			<A>(result: A) =>
			(values: Values): Values =>
				[...values, result] as Values;

		return pipe(
			args as unknown as Kind2<F, E, unknown>[],
			L.reduce(initial, (acc, curr) => {
				return pipe(
					acc,
					mo.chain((values) =>
						pipe(
							curr,
							mo.map((result) => merge(result)(values)),
						),
					),
				) as Kind2<F, E, Values>;
			}),
		) as Result<F, E, Args>;
	};
