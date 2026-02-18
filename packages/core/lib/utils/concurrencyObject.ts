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

import { Applicative } from "@/applicative";
import { Monad } from "@/monad";
import { pipe } from "@/pipe";
import { Kind, URIS } from "@/URIS";
import * as L from "@/list";
import { Delayable } from "@/delayable";
import { id } from "@/id";
import type { Simplify } from "./simplify";

// Tipo de la instancia de la mónada
type Instance<F extends URIS> = Monad<F> & Applicative<F> & Delayable<F>;

// Mapea cada propiedad del objeto extrayendo el tipo de valor A
type InferA<F extends URIS, Args> = {
	[K in keyof Args]: Args[K] extends Kind<F, infer A> ? A : never;
};

// Resultado con el tipo completamente expandido
type Result<F extends URIS, Args> = Kind<F, Simplify<InferA<F, Args>>>;

type Config = { concurrency?: number; delay?: number };

const reduceFn =
	<F extends URIS>(mo: Instance<F>) =>
	<Args extends Record<string, Kind<F, unknown>>>(
		acc: Kind<F, Simplify<InferA<F, Args>>>,
		[key, curr]: [string, Kind<F, unknown>],
	) => {
		type Values = Simplify<InferA<F, Args>>;
		const merge =
			(result: unknown) =>
			(values: Values): Values =>
				({ ...values, [key]: result }) as Values;
		return pipe(acc, mo.apply(pipe(curr, mo.map(merge)))) as Kind<F, Values>;
	};

/**
 * Ejecuta un objeto de mónadas con control de concurrencia y delay opcional.
 * Procesa las mónadas en lotes del tamaño especificado en la configuración.
 *
 * @example
 * ```typescript
 * import * as T from './task'
 * import { concurrencyObjectT } from './utils'
 *
 * const tasks = {
 *   user: T.of({ name: 'John', age: 30 }),
 *   posts: T.of([{ id: 1, title: 'Hello' }]),
 *   settings: T.of({ theme: 'dark' })
 * }
 *
 * // Ejecuta 2 tareas a la vez con 1 segundo de delay entre lotes
 * const result = concurrencyObjectT(T)({ concurrency: 2, delay: 1000 })(tasks)
 * // Task<{ user: User; posts: Post[]; settings: Settings }>
 * ```
 */
export const concurrencyObjectT =
	<F extends URIS>(mo: Instance<F>) =>
	(config?: Config) =>
	<Args extends Record<string, Kind<F, unknown>>>(args: Args): Result<F, Args> => {
		let acc = mo.of<Simplify<InferA<F, Args>>>({} as Simplify<InferA<F, Args>>);
		let entries = Object.entries(args);

		if (L.isEmpty(entries)) return acc as Result<F, Args>;

		const concurrencyNumber = config?.concurrency ?? entries.length;

		// Usar iteración en lugar de recursión para evitar fugas de memoria
		while (entries.length > 0) {
			const portion = entries.slice(0, concurrencyNumber);
			entries = entries.slice(concurrencyNumber);

			acc = pipe(
				acc,
				config?.delay ? mo.delay(config.delay) : id(),
				mo.chain((values) => pipe(portion, L.reduce(mo.of(values), reduceFn(mo)))),
			);
		}

		return acc as Result<F, Args>;
	};
