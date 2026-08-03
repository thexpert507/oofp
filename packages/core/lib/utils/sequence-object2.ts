/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind2, URIS2 } from "@/URIS2";
import { Applicative2 } from "@/applicative";
import * as L from "@/list";
import { Monad2 } from "@/monad";
import { pipe } from "@/pipe";
import type { EnsureKind2Record, Kind2Parts } from "./hkt-inference";
import type { Simplify } from "./simplify";

// Definimos el tipo Instance para Monad y Applicative
type Instance<F extends URIS2> = Monad2<F> & Applicative2<F>;

// Extrae la unión de todos los tipos de error del objeto
type UnionE<F extends URIS2, Args extends Record<string, unknown>> = Kind2Parts<
	F,
	Args[keyof Args]
>[0];

// Mapea cada propiedad del objeto extrayendo el tipo de valor A
type InferA<F extends URIS2, Args extends Record<string, unknown>> = {
	[K in keyof Args]: Kind2Parts<F, Args[K]>[1];
};

// Resultado con el tipo completamente expandido
type Result<F extends URIS2, E, Args extends Record<string, unknown>> = Kind2<
	F,
	E,
	Simplify<InferA<F, Args>>
>;

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
	<Args extends Record<string, unknown>>(
		args: Args & EnsureKind2Record<F, NoInfer<Args>>,
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
