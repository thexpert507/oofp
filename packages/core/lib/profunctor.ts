/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind2, URIS2 } from "@/URIS2";
import { compose } from "./compose.ts";
import { Fn } from "./function.ts";
import { id } from "./id.ts";

export interface ProFunctor<F extends URIS2> {
  readonly dimap: <E1, A, E2, B>(
    f1: Fn<E2, E1>,
    f2: Fn<A, B>
  ) => (fa: Kind2<F, E1, A>) => Kind2<F, E2, B>;
  readonly lmap: <E1, A, E2>(f: Fn<E2, E1>) => (fa: Kind2<F, E1, A>) => Kind2<F, E2, A>;
  readonly rmap: <E, A, B>(f: Fn<A, B>) => (fa: Kind2<F, E, A>) => Kind2<F, E, B>;
}

export interface Profunctor<A, B> {
  dimap<C, D>(f1: Fn<C, A>, f2: Fn<B, D>): Profunctor<C, D>;

  lmap<C>(f: Fn<C, A>): Profunctor<C, B>;

  rmap<D>(f: Fn<B, D>): Profunctor<A, D>;

  call(a: A): B;
}

export const profunctor = <A, B>(fn: Fn<A, B>): Profunctor<A, B> => ({
  dimap: <C, D>(f1: Fn<C, A>, f2: Fn<B, D>) => profunctor(compose(f2, fn, f1, id<C>())),
  lmap: <C>(f: Fn<C, A>) => profunctor(compose(fn, f, id<C>())),
  rmap: <D>(f: Fn<B, D>) => profunctor(compose(f, fn, id<A>())),
  call: (a: A) => fn(a),
});
