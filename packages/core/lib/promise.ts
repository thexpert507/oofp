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

import { Applicative } from "./applicative.ts";
import { Monad } from "./monad.ts";

export const URI = "Promise";
export type URI = typeof URI;

export const of = <A>(value: A): Promise<A> => Promise.resolve(value);

export const tap =
  <A>(f: (a: A) => void) =>
  (value: Promise<A>): Promise<A> =>
    value.then((value) => {
      f(value);
      return value;
    });

export const join = <A>(value: Promise<Promise<A>>): Promise<A> => value.then((value) => value);

export const map =
  <A, B>(f: (a: A) => B) =>
  (value: Promise<A>): Promise<B> =>
    value.then(f);

export const chain =
  <A, B>(f: (a: A) => Promise<B>) =>
  (value: Promise<A>): Promise<B> =>
    value.then(f);

export const apply =
  <A, B>(fab: Promise<(a: A) => B>) =>
  (fa: Promise<A>): Promise<B> =>
    fab.then((f) => fa.then(f));

export const isPromise = <A>(value: unknown): value is Promise<A> => value instanceof Promise;

export const reject = <A>(error: unknown): Promise<A> => Promise.reject(error);

export const resolve = <A>(value: A): Promise<A> => Promise.resolve(value);

interface PF extends Monad<URI>, Applicative<URI> {}

export const P: PF = { URI, map, join, of, chain, apply };
