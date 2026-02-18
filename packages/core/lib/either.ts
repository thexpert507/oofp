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

import type { Maybe } from './maybe.ts'
import * as M from './maybe.ts'
import { Fn } from './function.ts'
import { Monad2 } from './monad.ts'
import { BiFunctor2 } from './functor.ts'
import { sequenceObjectT2, sequenceT2 } from './utils'
import { Applicative2 } from './applicative.ts'
import { OrElse2 } from './or-else.ts'
import { BiPointed2 } from './bi-pointed.ts'

export const URI = 'Either'
export type URI = typeof URI

declare module './URIS2' {
  interface URItoKind2<E, A> {
    Either: Either<E, A>
  }
}

export type Left<E> = { tag: 'Left'; value: E }
export type Right<A> = { tag: 'Right'; value: A }
export type Either<E = never, A = never> = Left<E> | Right<A>

export const left = <E, A>(value: E): Either<E, A> => ({ tag: 'Left', value })
export const right = <E, A>(value: A): Either<E, A> => ({ tag: 'Right', value })
export const of = right

export const isLeft = <E, A>(either: Either<E, A>): either is Left<E> => either.tag === 'Left'
export const isRight = <E, A>(either: Either<E, A>): either is Right<A> => either.tag === 'Right'

export const fromNullable =
  <E>(onNone: E) =>
  <A>(value: A | null | undefined): Either<E, A> => {
    return value === null && value === undefined ? left(onNone) : right(value as A)
  }

export const identity = <E, A>(value: Either<E, A>): Either<E, A> => value

export const map =
  <A, B>(fn: Fn<A, B>) =>
  <E>(either: Either<E, A>): Either<E, B> =>
    either.tag === 'Right' ? right(fn(either.value)) : (either as Either)

export const mapLeft =
  <E, E2>(fn: Fn<E, E2>) =>
  <A>(either: Either<E, A>): Either<E2, A> =>
    either.tag === 'Left' ? left(fn(either.value)) : (either as Right<A>)

export const bimap =
  <E, A, E2, B>(fn: Fn<E, E2>, gn: Fn<A, B>) =>
  (either: Either<E, A>): Either<E2, B> =>
    either.tag === 'Left' ? left(fn(either.value)) : right(gn(either.value))

export const rmap = map

export const lmap =
  <E, E2>(fn: Fn<E, E2>) =>
  <A>(either: Either<E, A>): Either<E2, A> =>
    either.tag === 'Left' ? left(fn(either.value)) : (either as Right<A>)

export const chain =
  <E, A, U>(fn: (value: A) => Either<E, U>) =>
  (either: Either<E, A>): Either<E, U> =>
    either.tag === 'Right' ? fn(either.value) : (either as Left<E>)

export const orchain =
  <E, A, L2, R2>(fn: Fn<A, Either<L2, R2>>) =>
  (ma: Either<E, A>): Either<E | L2, R2> =>
    ma.tag === 'Right' ? fn(ma.value) : (ma as Left<E | L2>)

export const join = <E, A>(mma: Either<E, Either<E, A>>): Either<E, A> => (mma.tag === 'Left' ? mma : mma.value)

export const bindLeft =
  <E, A, U>(fn: (value: E) => Either<U, A>) =>
  (either: Either<E, A>): Either<U, A> =>
    either.tag === 'Left' ? fn(either.value) : (either as Right<A>)

export const orElse = bindLeft

export const tap =
  <A>(fn: (value: A) => void) =>
  <E>(either: Either<E, A>): Either<E, A> => {
    if (either.tag === 'Right') fn(either.value)
    return either
  }

export const tapLeft =
  <E>(fn: (value: E) => void) =>
  <A>(either: Either<E, A>): Either<E, A> => {
    if (either.tag === 'Left') fn(either.value)
    return either
  }

export const getOrElse =
  <E, A>(f: Fn<E, A>) =>
  (either: Either<E, A>): A =>
    either.tag === 'Right' ? either.value : f(either.value)

export const getLeftOrElse =
  <E>(defaultValue: E) =>
  <A>(either: Either<E, A>): E =>
    either.tag === 'Left' ? either.value : defaultValue

export const fold =
  <E, A, T>(onLeft: (value: E) => T, onRight: (value: A) => T) =>
  (either: Either<E, A>): T =>
    either.tag === 'Left' ? onLeft(either.value) : onRight(either.value)

export const toUnion = <E, A>(either: Either<E, A>): E | A => (either.tag === 'Left' ? either.value : either.value)

export const toNullable = <E, A>(either: Either<E, A>): A | null => (either.tag === 'Right' ? either.value : null)

export const toMaybe = <E, A>(either: Either<E, A>): Maybe<A> =>
  either.tag === 'Right' ? M.just(either.value) : M.nothing()

export const apply =
  <E, A, B>(fab: Either<E, Fn<A, B>>) =>
  (fa: Either<E, A>): Either<E, B> => {
    if (fa.tag === 'Left') return fa
    if (fab.tag === 'Left') return fab
    return right(fab.value(fa.value))
  }

export const applyw =
  <E, A, B>(fab: Either<E, Fn<A, B>>) =>
  <E2>(fa: Either<E2, A>): Either<E | E2, B> => {
    return fa.tag === 'Right' && fab.tag === 'Right' ? right(fab.value(fa.value)) : (fa as Left<E | E2>)
  }

interface EF extends Monad2<URI>, BiFunctor2<URI>, Applicative2<URI>, OrElse2<URI>, BiPointed2<URI> {}

export const E: EF = { URI, bimap, chain, join, of, map, apply, orElse, left, right }

export const sequence = sequenceT2(E)
export const sequenceObject = sequenceObjectT2(E)
