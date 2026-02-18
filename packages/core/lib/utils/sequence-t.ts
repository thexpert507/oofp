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
import { Kind2, URIS2 } from "@/URIS2";
import { Applicative2 } from "@/applicative";
import { Monad2 } from "@/monad";
import { Kind3, URIS3 } from "@/URIS3";
import { Applicative3 } from "@/applicative";
import { Monad3 } from "@/monad";

// Definimos el tipo de la instancia de la mónada, que tiene tanto `Monad` como `Applicative`.
type Instance<F extends URIS> = Monad<F> & Applicative<F>;
type Instance2<F extends URIS2> = Monad2<F> & Applicative2<F>;
type Instance3<F extends URIS3> = Monad3<F> & Applicative3<F>;

// Tipo para los valores que contiene cada mónada, como un array de `Kind<F, A>`
type ValueOfKind<F extends URIS, Args extends Kind<F, any>[]> = {
  [K in keyof Args]: Args[K] extends Kind<F, infer A> ? A : never;
};

type ValueOfKind2<F extends URIS2, Args extends Kind2<F, any, any>[]> = {
  [K in keyof Args]: Args[K] extends Kind2<F, any, infer A> ? A : never;
};

type ValueOfKind3<F extends URIS3, Args extends Kind3<F, any, any, any>[]> = {
  [K in keyof Args]: Args[K] extends Kind3<F, any, any, infer A> ? A : never;
};

//New type to infer the Error of URIS2
type InferE<F extends URIS2, Args extends Kind2<F, any, any>[]> = Args extends Kind2<
  F,
  infer E,
  any
>[]
  ? E
  : never;

type InferR<F extends URIS3, Args extends Kind3<F, any, any, any>[]> = Args extends Kind3<
  F,
  infer R,
  any,
  any
>[]
  ? R
  : never;

type InferE3<F extends URIS3, Args extends Kind3<F, any, any, any>[]> = Args extends Kind3<
  F,
  any,
  infer E,
  any
>[]
  ? E
  : never;

type ArgsType<F extends URIS> = [Kind<F, any>, ...Kind<F, any>[]] | Kind<F, any>[];
type ArgsType2<F extends URIS2, E> = [Kind2<F, E, any>, ...Kind2<F, E, any>[]] | Kind2<F, E, any>[];
type ArgsType3<F extends URIS3, R, E> =
  | [Kind3<F, R, E, any>, ...Kind3<F, R, E, any>[]]
  | Kind3<F, R, E, any>[];

// `sequenceT` que toma una instancia de la mónada y un array de mónadas, y devuelve una mónada con el tipo de los resultados combinados
export function sequenceT<F extends URIS>(
  mo: Instance<F>
): <Args extends ArgsType<F>>(args: Args) => Kind<F, ValueOfKind<F, Args>>;
export function sequenceT<F extends URIS2>(
  mo: Instance2<F>
): <E, Args extends ArgsType2<F, E>>(
  args: Args
) => Kind2<F, InferE<F, Args> & E, ValueOfKind2<F, Args>>;
export function sequenceT<F extends URIS3>(
  mo: Instance3<F>
): <R, E, Args extends ArgsType3<F, R, E>>(
  args: Args
) => Kind3<F, InferR<F, Args> & R, InferE3<F, Args> & E, ValueOfKind3<F, Args>>;
export function sequenceT(mo: any): any {
  return <Args extends any[]>(args: Args) => {
    const initial = mo.of([] as any);
    const merge = (result: any) => (values: any) => [...values, result];

    return pipe(
      args,
      L.reduce(initial, (acc: any, curr: any) => {
        return pipe(acc, mo.apply(pipe(curr, mo.map(merge))));
      })
    );
  };
}
