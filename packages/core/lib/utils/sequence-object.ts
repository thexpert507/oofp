/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
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
				return pipe(
					acc,
					mo.chain((values) => pipe(curr, mo.map((result) => merge(result)(values)))),
				) as Kind<F, Values>;
			}),
		) as Result<F, Args>;
	};
