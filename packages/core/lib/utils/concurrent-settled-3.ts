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

import { Kind3, URIS3 } from '@/URIS3'
import { Kind2, URIS2 } from '@/URIS2'
import { Monad3 } from '@/monad'
import { Applicative3 } from '@/applicative'
import { Delayable3 } from '@/delayable'
import { OrElse3 } from '@/or-else'
import { BiPointed2 } from '@/bi-pointed'
import { concurrency3 } from './concurrency-3'
import { pipe } from '@/pipe'

type Instance<F extends URIS3> = Monad3<F> & Applicative3<F> & Delayable3<F> & OrElse3<F>

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never

// biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
type ArgsType<F extends URIS3> = [Kind3<F, any, any, any>, ...Kind3<F, any, any, any>[]] | Kind3<F, any, any, any>[]

// biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
type UnionR<F extends URIS3, Args> = UnionToIntersection<
  Args extends readonly unknown[] ? (Args[number] extends Kind3<F, infer R, any, any> ? R : never) : never
>

type SettledResults<G extends URIS2, Args> = {
  [K in keyof Args]: Args[K] extends Kind3<URIS3, infer _R, infer _E, infer _A> ? Kind2<G, _E, _A> : never
}

type Config = { concurrency?: number; delay?: number }

export const concurrentSettled3 =
  <F extends URIS3>(mo: Instance<F>) =>
  <G extends URIS2>(collect: BiPointed2<G>) =>
  (config?: Config) =>
  <Args extends ArgsType<F>>(args: Args): Kind3<F, UnionR<F, Args>, never, SettledResults<G, Args>> => {
    const makeSafe = <R, E, A>(monad: Kind3<F, R, E, A>): Kind3<F, R, never, Kind2<G, E, A>> =>
      pipe(
        monad,
        mo.map((result): Kind2<G, E, A> => collect.right<E, A>(result)),
        mo.orElse((err): Kind3<F, R, never, Kind2<G, E, A>> => mo.of(collect.left<E, A>(err))),
      )

    // biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
    type SafeArg = Kind3<F, UnionR<F, Args>, never, Kind2<G, any, any>>
    // biome-ignore lint/suspicious/noExplicitAny: necesario para la inferencia correcta de tipos
    const safeMonads = args.map((arg) => makeSafe(arg as Kind3<F, UnionR<F, Args>, any, any>)) as Array<SafeArg>
    return concurrency3(mo)(config)(safeMonads as unknown as Args) as unknown as Kind3<
      F,
      UnionR<F, Args>,
      never,
      SettledResults<G, Args>
    >
  }
