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
import { Kind3, URIS3 } from "@/URIS3";
import * as L from "@/list";
import { Monad3 } from "@/monad";
import { Applicative3 } from "@/applicative";
import type { Simplify } from "./simplify";

// Definimos el tipo Instance para Monad y Applicative
type Instance<F extends URIS3> = Monad3<F> & Applicative3<F>;

// Utilidad para convertir uniones en intersecciones
// biome-ignore lint/suspicious/noExplicitAny: necesario para la transformación de tipos
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
	? I
	: never;

// Extrae todos los contextos R y los convierte en intersección (R1 & R2 & R3)
type UnionR<F extends URIS3, Args> = UnionToIntersection<
	// biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
	Args extends Record<string, Kind3<F, any, any, any>>
		? {
				// biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
				[K in keyof Args]: Args[K] extends Kind3<F, infer R, any, any> ? R : never;
			}[keyof Args]
		: never
>;

// Extrae la unión de todos los tipos de error del objeto (E1 | E2 | E3)
// biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
type UnionE<F extends URIS3, Args> = Args extends Record<string, Kind3<F, any, any, any>>
	? {
			// biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
			[K in keyof Args]: Args[K] extends Kind3<F, any, infer E, any> ? E : never;
		}[keyof Args]
	: never;

// Mapea cada propiedad del objeto extrayendo el tipo de valor A
type InferA<F extends URIS3, Args> = {
	// biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
	[K in keyof Args]: Args[K] extends Kind3<F, any, any, infer A> ? A : never;
};

// Resultado con el tipo completamente expandido
type Result<F extends URIS3, R, E, Args> = Kind3<F, R, E, Simplify<InferA<F, Args>>>;

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
	// biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
	<Args extends Record<string, Kind3<F, any, any, any>>>(
		args: Args,
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
				return pipe(acc, mo.apply(pipe(curr, mo.map(merge)))) as Kind3<F, R, E, Values>;
			}),
		) as Result<F, R, E, Args>;
	};
