/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Fn } from './function.ts'
import { Functor } from './functor.ts'
import * as U from './utils'

export const map =
  <A, B>(fn: Fn<A, B>) =>
  (list: A[]): B[] =>
    list.map(fn)

export const tap =
  <A>(fn: Fn<A, void>) =>
  (list: A[]): A[] => {
    list.forEach(fn)
    return list
  }

export const mapIndexed =
  <A, B>(fn: Fn<number, Fn<A, B>>) =>
  (list: A[]): B[] =>
    list.map((item, index) => fn(index)(item))

export const filter =
  <A>(fn: Fn<A, boolean>) =>
  (list: A[]): A[] =>
    list.filter(fn)

export const reduce =
  <A, B>(initial: B, fn: (acc: B, curr: A) => B) =>
  (list: A[]): B =>
    list.reduce(fn, initial)

export const reduceRight =
  <A, B>(initial: B, fn: (acc: B, curr: A) => B) =>
  (list: A[]): B =>
    list.reduceRight(fn, initial)

export const isEmpty = <A>(list: A[]): boolean => list.length === 0

export const size = <A>(list: A[]): number => list.length

export const flatten = <A>(list: A[][]): A[] => list.flat()

export const distinctBy =
  <A, B = A>(fn?: Fn<A, B>) =>
  (list: A[]): A[] => {
    if (!fn) return [...new Set(list)]

    const seen = new Set<B>()
    return list.filter((item) => {
      const key = fn(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

/**
 * Toma los primeros n elementos de una lista.
 *
 * @param n - El número de elementos a tomar desde el inicio de la lista
 * @returns Una función que toma una lista y retorna una nueva lista con los primeros n elementos
 *
 * @example
 * ```typescript
 * const takeThree = take(3);
 * takeThree([1, 2, 3, 4, 5]); // [1, 2, 3]
 *
 * take(2)(['a', 'b', 'c', 'd']); // ['a', 'b']
 * take(0)([1, 2, 3]); // []
 * take(10)([1, 2]); // [1, 2] (no falla si n > longitud del array)
 * ```
 */
export const take =
  (n: number) =>
  <A>(list: A[]): A[] =>
    list.slice(0, n)

export const chunk =
  (size: number) =>
  <A>(list: A[]): A[][] => {
    /**
     * Se utiliza un enfoque iterativo con un bucle for en lugar de recursividad
     * para evitar problemas de desbordamiento de pila con listas grandes.
     * Esta implementación es más eficiente en términos de memoria y rendimiento,
     * ya que evita múltiples creaciones de arrays y llamadas a funciones
     * que ocurrirían con un enfoque recursivo.
     */
    const result: A[][] = []
    for (let i = 0; i < list.length; i += size) {
      result.push(list.slice(i, i + size))
    }
    return result
  }

export const groupBy =
  <A>(fn: Fn<A, string>) =>
  (list: A[]): Record<string, A[]> =>
    U.groupBy(fn)(list)

export const indexBy =
  <A>(fn: Fn<A, string>) =>
  (list: A[]): Record<string, A> =>
    U.indexBy(fn)(list)

export const sort =
  <A>(fn: Fn<{ a: A; b: A }, number>) =>
  (list: A[]): A[] =>
    [...list].sort((a, b) => fn({ a, b }))

export const concat =
  <A>(list1: A[]) =>
  (list2: A[]): A[] =>
    list1.concat(list2)

export const append =
  <A>(item: A) =>
  (list: A[]): A[] =>
    list.concat(item)

export const prepend =
  <A>(item: A) =>
  (list: A[]): A[] =>
    [item].concat(list)

export const find =
  <A>(fn: Fn<A, boolean>) =>
  (list: A[]): A | undefined =>
    list.find(fn)

export const findMap =
  <A, B>(fn: Fn<A, B | undefined>) =>
  (list: A[]): B | undefined => {
    for (const item of list) {
      const result = fn(item)
      if (result !== undefined) return result
    }
  }

export const join =
  (separator: string) =>
  <A>(list: A[]): string =>
    list.join(separator)

export const update =
  (index: number) =>
  <A>(item: A) =>
  (list: A[]): A[] => {
    if (index < 0 || index >= list.length) return list
    const result = [...list]
    result[index] = item
    return result
  }

/**
 * Compara dos arrays de manera superficial (===).
 * @returns true si ambos arrays tienen la misma longitud y elementos equivalentes en las mismas posiciones
 */
export const equals =
  <A>(list1: A[]) =>
  (list2: A[]): boolean => {
    if (list1.length !== list2.length) return false
    return list1.every((item, index) => item === list2[index])
  }

export const L = { map } satisfies Functor<'Array'>
