/**
 * Copyright (C) 2025 thexpert507
 *
 * This file is part of @oofp/core.
 *
 * @oofp/core is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { pipe } from "@/pipe";
import * as L from "@/list";
import { URIS2, Kind2 } from "@/URIS2";
import { Monad2 } from "@/monad";
import { Applicative2 } from "@/applicative";

// Definimos el tipo de la instancia de la mónada, que tiene tanto `Monad` como `Applicative`.
type Instance<F extends URIS2> = Monad2<F> & Applicative2<F>;

// Tipo para argumentos (permite inferencia de tipos)
type ArgsType<F extends URIS2> =
	| [Kind2<F, unknown, unknown>, ...Kind2<F, unknown, unknown>[]]
	| Kind2<F, unknown, unknown>[];

// Tipo para los valores que contiene cada mónada, como un array de `Kind<F, A>`
type VOK<F extends URIS2, Args> = {
	[K in keyof Args]: Args[K] extends Kind2<F, unknown, infer A> ? A : never;
};

// Extrae y une todos los tipos de error E1 | E2 | E3 | ...
type UnionE<F extends URIS2, Args> = Args extends readonly unknown[]
	? Args[number] extends Kind2<F, infer E, unknown>
		? E
		: never
	: never;

type Result<F extends URIS2, E, Args> = Kind2<F, E, VOK<F, Args>>;

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
	<Args extends ArgsType<F>>(args: Args): Result<F, UnionE<F, Args>, Args> => {
		type E = UnionE<F, Args>;
		type Values = VOK<F, Args>;

		const initial = mo.of<E, Values>([] as unknown as Values);

		const merge =
			<A>(result: A) =>
			(values: Values): Values =>
				[...values, result] as Values;

		return pipe(
			args as Kind2<F, E, unknown>[],
			L.reduce(initial, (acc, curr) => {
				return pipe(acc, mo.apply(pipe(curr, mo.map(merge)))) as Kind2<F, E, Values>;
			}),
		) as Result<F, E, Args>;
	};
