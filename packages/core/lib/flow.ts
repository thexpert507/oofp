/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

type Fn<A, B> = (a: A) => B;

export function flow<A, R>(fn: Fn<A, R>): Fn<A, R>;
export function flow<A, B, R>(fn1: Fn<A, B>, fn2: Fn<B, R>): Fn<A, R>;
export function flow<A, B, C, R>(fn1: Fn<A, B>, fn2: Fn<B, C>, fn3: Fn<C, R>): Fn<A, R>;
export function flow<A, B, C, D, R>(
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, R>
): Fn<A, R>;
export function flow<A, B, C, D, E, R>(
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, E>,
  fn5: Fn<E, R>
): Fn<A, R>;
export function flow<A, B, C, D, E, F, R>(
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, E>,
  fn5: Fn<E, F>,
  fn6: Fn<F, R>
): Fn<A, R>;
export function flow<A, B, C, D, E, F, G, R>(
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, E>,
  fn5: Fn<E, F>,
  fn6: Fn<F, G>,
  fn7: Fn<G, R>
): Fn<A, R>;
export function flow<A, B, C, D, E, F, G, H, R>(
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, E>,
  fn5: Fn<E, F>,
  fn6: Fn<F, G>,
  fn7: Fn<G, H>,
  fn8: Fn<H, R>
): Fn<A, R>;
export function flow<A, B, C, D, E, F, G, H, I, R>(
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, E>,
  fn5: Fn<E, F>,
  fn6: Fn<F, G>,
  fn7: Fn<G, H>,
  fn8: Fn<H, I>,
  fn9: Fn<I, R>
): Fn<A, R>;
export function flow<A, B, C, D, E, F, G, H, I, J, R>(
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, E>,
  fn5: Fn<E, F>,
  fn6: Fn<F, G>,
  fn7: Fn<G, H>,
  fn8: Fn<H, I>,
  fn9: Fn<I, J>,
  fn10: Fn<J, R>
): Fn<A, R>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, R>(
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, E>,
  fn5: Fn<E, F>,
  fn6: Fn<F, G>,
  fn7: Fn<G, H>,
  fn8: Fn<H, I>,
  fn9: Fn<I, J>,
  fn10: Fn<J, K>,
  fn11: Fn<K, R>
): Fn<A, R>;
export function flow<A, B, C, D, E, F, G, H, I, J, K, L, R>(
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, E>,
  fn5: Fn<E, F>,
  fn6: Fn<F, G>,
  fn7: Fn<G, H>,
  fn8: Fn<H, I>,
  fn9: Fn<I, J>,
  fn10: Fn<J, K>,
  fn11: Fn<K, L>,
  fn12: Fn<L, R>
): Fn<A, R>;
export function flow(...fns: Fn<unknown, unknown>[]) {
  return (x: unknown) => fns.reduce((v, f) => f(v), x);
}
