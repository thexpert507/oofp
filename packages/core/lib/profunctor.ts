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
