/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind3, URIS3 } from "@/URIS3";
import { Applicative3 } from "@/applicative";
import * as L from "@/list";
import { Monad3 } from "@/monad";
import { pipe } from "@/pipe";
import type { EnsureKinds3, UnionToIntersection } from "./hkt-inference";

// Definimos el tipo de la instancia de la mónada, que tiene tanto `Monad` como `Applicative`.
type Instance<F extends URIS3> = Monad3<F> & Applicative3<F>;

// Tipo para los valores que contiene cada mónada, como un array de `Kind3<F, R, E, A>`
type VOK<F extends URIS3, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind3<F, infer _R, infer _E, infer A> ? A : never;
};

type Contexts<F extends URIS3, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind3<F, infer R, infer _E, infer _A> ? R : never;
};

type Errors<F extends URIS3, Args extends unknown[]> = {
	[K in keyof Args]: Args[K] extends Kind3<F, infer _R, infer E, infer _A> ? E : never;
};

// Extrae y combina todos los contextos R1 & R2 & R3 & ...
type UnionR<F extends URIS3, Args extends unknown[]> = UnionToIntersection<
	Contexts<F, Args>[number]
>;

// Extrae y une todos los tipos de error E1 | E2 | E3 | ...
type UnionE<F extends URIS3, Args extends unknown[]> = Errors<F, Args>[number];

type Result<F extends URIS3, R, E, Args extends unknown[]> = Kind3<F, R, E, VOK<F, Args>>;

/**
 * Secuencia un array/tupla de mónadas Kind3.
 * TypeScript infiere automáticamente:
 * - El contexto R como intersección de todos los contextos: R1 & R2 & R3
 * - El error E como unión de todos los errores: E1 | E2 | E3
 *
 * @example
 * ```typescript
 * import * as RTE from './reader-task-either'
 * import { sequenceT3 } from './utils'
 *
 * type Config = { apiUrl: string }
 * type Logger = { log: (msg: string) => void }
 *
 * const result = sequenceT3(RTE.RTE)([
 *   RTE.of<Config, string, number>(1),
 *   RTE.of<Logger, Error, string>('hello'),
 *   RTE.of<Config, boolean, boolean>(true)
 * ])
 * // ReaderTaskEither<Config & Logger, string | Error | boolean, [number, string, boolean]>
 * ```
 */
export const sequenceT3 =
	<F extends URIS3>(mo: Instance<F>) =>
	<const Args extends unknown[]>(
		args: Args,
		..._validation: Args extends EnsureKinds3<F, Args> ? [] : [invalid: never]
	): Result<F, UnionR<F, Args>, UnionE<F, Args>, Args> => {
		type R = UnionR<F, Args>;
		type E = UnionE<F, Args>;
		type Values = VOK<F, Args>;

		const initial = mo.of<R, E, Values>([] as unknown as Values);

		const merge =
			<A>(result: A) =>
			(values: Values): Values =>
				[...values, result] as Values;

		return pipe(
			args as unknown as Kind3<F, R, E, unknown>[],
			L.reduce(initial, (acc, curr) => {
				return pipe(
					acc,
					mo.chain((values) =>
						pipe(
							curr,
							mo.map((result) => merge(result)(values)),
						),
					),
				) as Kind3<F, R, E, Values>;
			}),
		) as Result<F, R, E, Args>;
	};
