/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind3, URIS3 } from "@/URIS3";
import { Applicative3 } from "@/applicative";
import * as L from "@/list";
import { Monad3 } from "@/monad";
import { pipe } from "@/pipe";
import type { EnsureKind3Record, Kind3Parts, UnionToIntersection } from "./hkt-inference";
import type { Simplify } from "./simplify";

// Definimos el tipo Instance para Monad y Applicative
type Instance<F extends URIS3> = Monad3<F> & Applicative3<F>;

// Extrae todos los contextos R y los convierte en intersección (R1 & R2 & R3)
type UnionR<F extends URIS3, Args extends Record<string, unknown>> = UnionToIntersection<
	Kind3Parts<F, Args[keyof Args]>[0]
>;

// Extrae la unión de todos los tipos de error del objeto (E1 | E2 | E3)
type UnionE<F extends URIS3, Args extends Record<string, unknown>> = Kind3Parts<
	F,
	Args[keyof Args]
>[1];

// Mapea cada propiedad del objeto extrayendo el tipo de valor A
type InferA<F extends URIS3, Args extends Record<string, unknown>> = {
	[K in keyof Args]: Kind3Parts<F, Args[K]>[2];
};

// Resultado con el tipo completamente expandido
type Result<F extends URIS3, R, E, Args extends Record<string, unknown>> = Kind3<
	F,
	R,
	E,
	Simplify<InferA<F, Args>>
>;

/**
 * Secuencia un objeto de mónadas Kind3.
 * TypeScript infiere automáticamente el tipo R y E como la unión de todos los tipos.
 * El resultado es un objeto con la misma estructura pero con los valores extraídos.
 *
 * @example
 * ```typescript
 * import * as RTE from './reader-task-either'
 * import { sequenceObjectT3 } from './utils'
 *
 * const result = sequenceObjectT3(RTE.RTE)({
 *   user: RTE.of<Config, string, User>({ id: 1, name: 'John' }),
 *   posts: RTE.of<Config, string, Post[]>([]),
 *   settings: RTE.of<Config, string, Settings>({ theme: 'dark' })
 * })
 * // ReaderTaskEither<Config, string, { user: User; posts: Post[]; settings: Settings }>
 * ```
 */
export const sequenceObjectT3 =
	<F extends URIS3>(mo: Instance<F>) =>
	<Args extends Record<string, unknown>>(
		args: Args & EnsureKind3Record<F, NoInfer<Args>>,
	): Result<F, UnionR<F, Args>, UnionE<F, Args>, Args> => {
		type R = UnionR<F, Args>;
		type E = UnionE<F, Args>;
		type Values = Simplify<InferA<F, Args>>;

		const initial = mo.of<R, E, Values>({} as Values);
		return pipe(
			args,
			Object.entries,
			L.reduce(initial, (acc, [key, curr]: [string, Kind3<F, R, E, unknown>]) => {
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
				) as Kind3<F, R, E, Values>;
			}),
		) as Result<F, R, E, Args>;
	};
