/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
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
