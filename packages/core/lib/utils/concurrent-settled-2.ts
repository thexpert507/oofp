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

import { Kind2, URIS2 } from '@/URIS2'
import { Monad2 } from '@/monad'
import { Applicative2 } from '@/applicative'
import { Delayable2 } from '@/delayable'
import { OrElse2 } from '@/or-else'
import { BiPointed2 } from '@/bi-pointed'
import { concurrency2 } from './concurrency-2'
import { pipe } from '@/pipe'

type Instance<F extends URIS2> = Monad2<F> & Applicative2<F> & Delayable2<F> & OrElse2<F>

type ArgsType<F extends URIS2> =
  | [Kind2<F, unknown, unknown>, ...Kind2<F, unknown, unknown>[]]
  | Kind2<F, unknown, unknown>[]

type SettledResults<G extends URIS2, Args> = {
  [K in keyof Args]: Args[K] extends Kind2<URIS2, infer _E, infer _A> ? Kind2<G, _E, _A> : never
}

type Config = { concurrency?: number; delay?: number }

export const concurrentSettled2 =
  <F extends URIS2>(mo: Instance<F>) =>
  <G extends URIS2>(collect: BiPointed2<G>) =>
  (config?: Config) =>
  <Args extends ArgsType<F>>(args: Args): Kind2<F, never, SettledResults<G, Args>> => {
    const makeSafe = <E, A>(monad: Kind2<F, E, A>): Kind2<F, never, Kind2<G, E, A>> =>
      pipe(
        monad,
        mo.map((result): Kind2<G, E, A> => collect.right<E, A>(result)),
        mo.orElse((err): Kind2<F, never, Kind2<G, E, A>> => mo.of(collect.left<E, A>(err))),
      )

    type SafeArg = Kind2<F, never, Kind2<G, unknown, unknown>>
    const safeMonads = args.map((arg) => makeSafe(arg as Kind2<F, unknown, unknown>)) as Array<SafeArg>
    return concurrency2(mo)(config)(safeMonads as unknown as Args) as unknown as Kind2<
      F,
      never,
      SettledResults<G, Args>
    >
  }
