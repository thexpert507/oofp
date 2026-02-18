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

import { Applicative2 } from "./applicative";
import { Fn } from "./function";
import { Functor2 } from "./functor";
import { Monad2 } from "./monad";
import { pipe } from "./pipe";
import { Pointed2 } from "./pointed";

export const URI = "State";
export type URI = typeof URI;

declare module "@/URIS2" {
  interface URItoKind2<E, A> {
    State: State<E, A>;
  }
}

export type State<S, A> = (s: S) => [A, S];

export const of =
  <S, A>(value: A): State<S, A> =>
  (s: S) =>
    [value, s];

export const map =
  <A, B>(fn: Fn<A, B>) =>
  <S>(as: State<S, A>): State<S, B> =>
  (s: S) =>
    pipe(as(s), ([a, s]) => [fn(a), s]);

export const join =
  <S, A>(ssa: State<S, State<S, A>>): State<S, A> =>
  (s: S) =>
    pipe(ssa(s), ([sa, s]) => sa(s));

export const chain =
  <S, A, B>(fn: Fn<A, State<S, B>>) =>
  (as: State<S, A>): State<S, B> =>
  (s: S) =>
    pipe(as(s), ([a, s]) => fn(a)(s));

export const chainFirst =
  <S, A>(fn: Fn<A, State<S, unknown>>) =>
  (as: State<S, A>): State<S, A> =>
  (s: S) => {
    const [a, s1] = as(s);
    const [_, s2] = fn(a)(s1);
    return [a, s2];
  };

export const apply =
  <S, A, B>(fs: State<S, Fn<A, B>>) =>
  (as: State<S, A>): State<S, B> =>
    pipe(
      fs,
      chain((f) => pipe(as, map(f)))
    );

export const run =
  <S>(s: S) =>
  <A>(as: State<S, A>) =>
    as(s);

export const runS =
  <S>(s: S) =>
  <A>(as: State<S, A>): S =>
    as(s)[1];

export const runEval =
  <S>(s: S) =>
  <A>(as: State<S, A>): A =>
    as(s)[0];

interface SF extends Monad2<URI>, Applicative2<URI>, Pointed2<URI>, Functor2<URI> {}

export const S: SF = { URI, of, map, chain, join, apply };
