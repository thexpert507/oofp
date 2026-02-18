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
import { Kind2, URIS2 } from "@/URIS2";
import * as L from "@/list";
import { Monad2 } from "@/monad";
import { Applicative2 } from "@/applicative";
import type { Simplify } from "./simplify";

// Definimos el tipo Instance para Monad y Applicative
type Instance<F extends URIS2> = Monad2<F> & Applicative2<F>;

// Extrae la unión de todos los tipos de error del objeto
type UnionE<F extends URIS2, Args> = Args extends Record<string, Kind2<F, unknown, unknown>>
	? Args[keyof Args] extends Kind2<F, infer E, unknown>
		? E
		: never
	: never;

// Mapea cada propiedad del objeto extrayendo el tipo de valor A
type InferA<F extends URIS2, Args> = {
	[K in keyof Args]: Args[K] extends Kind2<F, unknown, infer A> ? A : never;
};

// Resultado con el tipo completamente expandido
type Result<F extends URIS2, E, Args> = Kind2<F, E, Simplify<InferA<F, Args>>>;

/**
 * Secuencia un objeto de mónadas Kind2.
 * TypeScript infiere automáticamente el tipo de error como la unión de todos los tipos E.
 * El resultado es un objeto con la misma estructura pero con los valores extraídos.
 *
 * @example
 * ```typescript
 * import * as E from './either'
 * import { sequenceObjectT2 } from './utils'
 *
 * const result = sequenceObjectT2(E)({
 *   name: E.right<string, string>('John'),
 *   age: E.right<number, number>(30),
 *   active: E.right<boolean, boolean>(true)
 * })
 * // Either<string | number | boolean, { name: string; age: number; active: boolean }>
 * ```
 */
export const sequenceObjectT2 =
	<F extends URIS2>(mo: Instance<F>) =>
	<Args extends Record<string, Kind2<F, unknown, unknown>>>(
		args: Args,
	): Result<F, UnionE<F, Args>, Args> => {
		type E = UnionE<F, Args>;
		type Values = Simplify<InferA<F, Args>>;

		const initial = mo.of<E, Values>({} as Values);
		return pipe(
			args,
			Object.entries,
			L.reduce(initial, (acc, [key, curr]: [string, Kind2<F, E, unknown>]) => {
				const merge =
					(result: unknown) =>
					(values: Values): Values =>
						({ ...values, [key]: result }) as Values;
				return pipe(acc, mo.apply(pipe(curr, mo.map(merge)))) as Kind2<F, E, Values>;
			}),
		) as Result<F, E, Args>;
	};
