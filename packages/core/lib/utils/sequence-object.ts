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
import type { Simplify } from "./simplify";

// Definimos el tipo Instance para Monad y Applicative
type Instance<F extends URIS> = Monad<F> & Applicative<F>;

// Mapea cada propiedad del objeto extrayendo el tipo de valor A
type InferA<F extends URIS, Args> = {
	[K in keyof Args]: Args[K] extends Kind<F, infer A> ? A : never;
};

// Resultado con el tipo completamente expandido
type Result<F extends URIS, Args> = Kind<F, Simplify<InferA<F, Args>>>;

// Implementamos `sequenceT` para objetos
export const sequenceObjectT =
	<F extends URIS>(mo: Instance<F>) =>
	<Args extends Record<string, Kind<F, unknown>>>(args: Args): Result<F, Args> => {
		type Values = Simplify<InferA<F, Args>>;

		const initial = mo.of<Values>({} as Values);
		return pipe(
			args,
			Object.entries,
			L.reduce(initial, (acc, [key, curr]: [string, Kind<F, unknown>]) => {
				const merge =
					(result: unknown) =>
					(values: Values): Values =>
						({ ...values, [key]: result }) as Values;
				return pipe(acc, mo.apply(pipe(curr, mo.map(merge)))) as Kind<F, Values>;
			}),
		) as Result<F, Args>;
	};
