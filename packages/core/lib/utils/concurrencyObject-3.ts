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
import { Delayable3 } from "@/delayable";
import { id } from "@/id";
import type { Simplify } from "./simplify";

// Tipo de la instancia de la mónada
type Instance<F extends URIS3> = Monad3<F> & Applicative3<F> & Delayable3<F>;

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

type Config = { concurrency?: number; delay?: number };

const reduceFn =
	<F extends URIS3>(mo: Instance<F>) =>
	// biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
	<R, E, Args extends Record<string, Kind3<F, any, any, any>>>(
		acc: Kind3<F, R, E, Simplify<InferA<F, Args>>>,
		[key, curr]: [string, Kind3<F, R, E, unknown>],
	) => {
		type Values = Simplify<InferA<F, Args>>;
		const merge =
			(result: unknown) =>
			(values: Values): Values =>
				({ ...values, [key]: result }) as Values;
		return pipe(acc, mo.apply(pipe(curr, mo.map(merge)))) as Kind3<F, R, E, Values>;
	};

/**
 * Ejecuta un objeto de mónadas Kind3 con control de concurrencia y delay opcional.
 * Procesa las mónadas en lotes del tamaño especificado en la configuración.
 * TypeScript infiere automáticamente:
 * - El contexto R como intersección de todos los contextos: R1 & R2 & R3
 * - El error E como unión de todos los errores: E1 | E2 | E3
 *
 * @example
 * ```typescript
 * import * as RTE from './reader-task-either'
 * import { concurrencyObject3 } from './utils'
 *
 * type Config = { apiUrl: string }
 * type Logger = { log: (msg: string) => void }
 *
 * const tasks = {
 *   user: RTE.of<Config, string, User>({ name: 'John', age: 30 }),
 *   posts: RTE.of<Logger, Error, Post[]>([{ id: 1, title: 'Hello' }]),
 *   settings: RTE.of<Config, boolean, Settings>({ theme: 'dark' })
 * }
 *
 * // Ejecuta 2 tareas a la vez con 1 segundo de delay entre lotes
 * const result = concurrencyObject3(RTE.RTE)({ concurrency: 2, delay: 1000 })(tasks)
 * // ReaderTaskEither<Config & Logger, string | Error | boolean, { user: User; posts: Post[]; settings: Settings }>
 * ```
 */
export const concurrencyObject3 =
	<F extends URIS3>(mo: Instance<F>) =>
	(config?: Config) =>
	// biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
	<Args extends Record<string, Kind3<F, any, any, any>>>(
		args: Args,
	): Result<F, UnionR<F, Args>, UnionE<F, Args>, Args> => {
		type R = UnionR<F, Args>;
		type E = UnionE<F, Args>;

		let acc = mo.of<R, E, Simplify<InferA<F, Args>>>({} as Simplify<InferA<F, Args>>);
		let entries = Object.entries(args);

		if (L.isEmpty(entries)) return acc as Result<F, R, E, Args>;

		const concurrencyNumber = config?.concurrency ?? entries.length;

		// Usar iteración en lugar de recursión para evitar fugas de memoria
		while (entries.length > 0) {
			const portion = entries.slice(0, concurrencyNumber);
			entries = entries.slice(concurrencyNumber);

			acc = pipe(
				acc,
				config?.delay ? mo.delay(config.delay) : id(),
				mo.chain((values) =>
					pipe(
						portion as [string, Kind3<F, R, E, unknown>][],
						L.reduce(mo.of(values), reduceFn(mo)),
					),
				),
			);
		}

		return acc as Result<F, R, E, Args>;
	};
