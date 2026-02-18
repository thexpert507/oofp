/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { pipe } from "@/pipe";
import * as L from "@/list";
import { URIS3, Kind3 } from "@/URIS3";
import { Monad3 } from "@/monad";
import { Applicative3 } from "@/applicative";

// Definimos el tipo de la instancia de la mónada, que tiene tanto `Monad` como `Applicative`.
type Instance<F extends URIS3> = Monad3<F> & Applicative3<F>;

// Utilidad para convertir uniones en intersecciones
// biome-ignore lint/suspicious/noExplicitAny: necesario para la transformación de tipos
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
	? I
	: never;

// Tipo para argumentos (permite inferencia de tipos)
type ArgsType<F extends URIS3> =
	// biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
	| [Kind3<F, any, any, any>, ...Kind3<F, any, any, any>[]]
	// biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
	| Kind3<F, any, any, any>[];

// Tipo para los valores que contiene cada mónada, como un array de `Kind3<F, R, E, A>`
type VOK<F extends URIS3, Args> = {
	// biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
	[K in keyof Args]: Args[K] extends Kind3<F, any, any, infer A> ? A : never;
};

// Extrae y combina todos los contextos R1 & R2 & R3 & ...
type UnionR<F extends URIS3, Args> = UnionToIntersection<
	Args extends readonly unknown[]
		? // biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
			Args[number] extends Kind3<F, infer R, any, any>
			? R
			: never
		: never
>;

// Extrae y une todos los tipos de error E1 | E2 | E3 | ...
type UnionE<F extends URIS3, Args> = Args extends readonly unknown[]
	? // biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
		Args[number] extends Kind3<F, any, infer E, any>
		? E
		: never
	: never;

type Result<F extends URIS3, R, E, Args> = Kind3<F, R, E, VOK<F, Args>>;

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
	<Args extends ArgsType<F>>(args: Args): Result<F, UnionR<F, Args>, UnionE<F, Args>, Args> => {
		type R = UnionR<F, Args>;
		type E = UnionE<F, Args>;
		type Values = VOK<F, Args>;

		const initial = mo.of<R, E, Values>([] as unknown as Values);

		const merge =
			<A>(result: A) =>
			(values: Values): Values =>
				[...values, result] as Values;

		return pipe(
			args as Kind3<F, R, E, unknown>[],
			L.reduce(initial, (acc, curr) => {
				return pipe(
					acc,
					mo.chain((values) => pipe(curr, mo.map((result) => merge(result)(values)))),
				) as Kind3<F, R, E, Values>;
			}),
		) as Result<F, R, E, Args>;
	};
