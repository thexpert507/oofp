/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

type Fn<A, B> = (a: A) => B;

export function compose<A, R>(fn: Fn<A, R>): Fn<A, R>;
export function compose<A, B, R>(fn1: Fn<B, R>, fn2: Fn<A, B>): Fn<A, R>;
export function compose<A, B, C, R>(fn1: Fn<C, R>, fn2: Fn<B, C>, fn3: Fn<A, B>): Fn<A, R>;
export function compose<A, B, C, D, R>(
  fn1: Fn<D, R>,
  fn2: Fn<C, D>,
  fn3: Fn<B, C>,
  fn4: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, R>(
  fn1: Fn<E, R>,
  fn2: Fn<D, E>,
  fn3: Fn<C, D>,
  fn4: Fn<B, C>,
  fn5: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, R>(
  fn1: Fn<F, R>,
  fn2: Fn<E, F>,
  fn3: Fn<D, E>,
  fn4: Fn<C, D>,
  fn5: Fn<B, C>,
  fn6: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, R>(
  fn1: Fn<G, R>,
  fn2: Fn<F, G>,
  fn3: Fn<E, F>,
  fn4: Fn<D, E>,
  fn5: Fn<C, D>,
  fn6: Fn<B, C>,
  fn7: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, R>(
  fn1: Fn<H, R>,
  fn2: Fn<G, H>,
  fn3: Fn<F, G>,
  fn4: Fn<E, F>,
  fn5: Fn<D, E>,
  fn6: Fn<C, D>,
  fn7: Fn<B, C>,
  fn8: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, R>(
  fn1: Fn<I, R>,
  fn2: Fn<H, I>,
  fn3: Fn<G, H>,
  fn4: Fn<F, G>,
  fn5: Fn<E, F>,
  fn6: Fn<D, E>,
  fn7: Fn<C, D>,
  fn8: Fn<B, C>,
  fn9: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, R>(
  fn1: Fn<J, R>,
  fn2: Fn<I, J>,
  fn3: Fn<H, I>,
  fn4: Fn<G, H>,
  fn5: Fn<F, G>,
  fn6: Fn<E, F>,
  fn7: Fn<D, E>,
  fn8: Fn<C, D>,
  fn9: Fn<B, C>,
  fn10: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, R>(
  fn1: Fn<K, R>,
  fn2: Fn<J, K>,
  fn3: Fn<I, J>,
  fn4: Fn<H, I>,
  fn5: Fn<G, H>,
  fn6: Fn<F, G>,
  fn7: Fn<E, F>,
  fn8: Fn<D, E>,
  fn9: Fn<C, D>,
  fn10: Fn<B, C>,
  fn11: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, L, R>(
  fn1: Fn<L, R>,
  fn2: Fn<K, L>,
  fn3: Fn<J, K>,
  fn4: Fn<I, J>,
  fn5: Fn<H, I>,
  fn6: Fn<G, H>,
  fn7: Fn<F, G>,
  fn8: Fn<E, F>,
  fn9: Fn<D, E>,
  fn10: Fn<C, D>,
  fn11: Fn<B, C>,
  fn12: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, L, M, R>(
  fn1: Fn<M, R>,
  fn2: Fn<L, M>,
  fn3: Fn<K, L>,
  fn4: Fn<J, K>,
  fn5: Fn<I, J>,
  fn6: Fn<H, I>,
  fn7: Fn<G, H>,
  fn8: Fn<F, G>,
  fn9: Fn<E, F>,
  fn10: Fn<D, E>,
  fn11: Fn<C, D>,
  fn12: Fn<B, C>,
  fn13: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, L, M, N, R>(
  fn1: Fn<N, R>,
  fn2: Fn<M, N>,
  fn3: Fn<L, M>,
  fn4: Fn<K, L>,
  fn5: Fn<J, K>,
  fn6: Fn<I, J>,
  fn7: Fn<H, I>,
  fn8: Fn<G, H>,
  fn9: Fn<F, G>,
  fn10: Fn<E, F>,
  fn11: Fn<D, E>,
  fn12: Fn<C, D>,
  fn13: Fn<B, C>,
  fn14: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, R>(
  fn1: Fn<O, R>,
  fn2: Fn<N, O>,
  fn3: Fn<M, N>,
  fn4: Fn<L, M>,
  fn5: Fn<K, L>,
  fn6: Fn<J, K>,
  fn7: Fn<I, J>,
  fn8: Fn<H, I>,
  fn9: Fn<G, H>,
  fn10: Fn<F, G>,
  fn11: Fn<E, F>,
  fn12: Fn<D, E>,
  fn13: Fn<C, D>,
  fn14: Fn<B, C>,
  fn15: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, R>(
  fn1: Fn<P, R>,
  fn2: Fn<O, P>,
  fn3: Fn<N, O>,
  fn4: Fn<M, N>,
  fn5: Fn<L, M>,
  fn6: Fn<K, L>,
  fn7: Fn<J, K>,
  fn8: Fn<I, J>,
  fn9: Fn<H, I>,
  fn10: Fn<G, H>,
  fn11: Fn<F, G>,
  fn12: Fn<E, F>,
  fn13: Fn<D, E>,
  fn14: Fn<C, D>,
  fn15: Fn<B, C>,
  fn16: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
  fn1: Fn<Q, R>,
  fn2: Fn<P, Q>,
  fn3: Fn<O, P>,
  fn4: Fn<N, O>,
  fn5: Fn<M, N>,
  fn6: Fn<L, M>,
  fn7: Fn<K, L>,
  fn8: Fn<J, K>,
  fn9: Fn<I, J>,
  fn10: Fn<H, I>,
  fn11: Fn<G, H>,
  fn12: Fn<F, G>,
  fn13: Fn<E, F>,
  fn14: Fn<D, E>,
  fn15: Fn<C, D>,
  fn16: Fn<B, C>,
  fn17: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
  fn1: Fn<S, R>,
  fn2: Fn<Q, S>,
  fn3: Fn<P, Q>,
  fn4: Fn<O, P>,
  fn5: Fn<N, O>,
  fn6: Fn<M, N>,
  fn7: Fn<L, M>,
  fn8: Fn<K, L>,
  fn9: Fn<J, K>,
  fn10: Fn<I, J>,
  fn11: Fn<H, I>,
  fn12: Fn<G, H>,
  fn13: Fn<F, G>,
  fn14: Fn<E, F>,
  fn15: Fn<D, E>,
  fn16: Fn<C, D>,
  fn17: Fn<B, C>,
  fn18: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
  fn1: Fn<T, R>,
  fn2: Fn<S, T>,
  fn3: Fn<Q, S>,
  fn4: Fn<P, Q>,
  fn5: Fn<O, P>,
  fn6: Fn<N, O>,
  fn7: Fn<M, N>,
  fn8: Fn<L, M>,
  fn9: Fn<K, L>,
  fn10: Fn<J, K>,
  fn11: Fn<I, J>,
  fn12: Fn<H, I>,
  fn13: Fn<G, H>,
  fn14: Fn<F, G>,
  fn15: Fn<E, F>,
  fn16: Fn<D, E>,
  fn17: Fn<C, D>,
  fn18: Fn<B, C>,
  fn19: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(
  fn1: Fn<U, R>,
  fn2: Fn<T, U>,
  fn3: Fn<S, T>,
  fn4: Fn<Q, S>,
  fn5: Fn<P, Q>,
  fn6: Fn<O, P>,
  fn7: Fn<N, O>,
  fn8: Fn<M, N>,
  fn9: Fn<L, M>,
  fn10: Fn<K, L>,
  fn11: Fn<J, K>,
  fn12: Fn<I, J>,
  fn13: Fn<H, I>,
  fn14: Fn<G, H>,
  fn15: Fn<F, G>,
  fn16: Fn<E, F>,
  fn17: Fn<D, E>,
  fn18: Fn<C, D>,
  fn19: Fn<B, C>,
  fn20: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V>(
  fn1: Fn<V, R>,
  fn2: Fn<U, V>,
  fn3: Fn<T, U>,
  fn4: Fn<S, T>,
  fn5: Fn<R, S>,
  fn6: Fn<Q, R>,
  fn7: Fn<P, Q>,
  fn8: Fn<O, P>,
  fn9: Fn<N, O>,
  fn10: Fn<M, N>,
  fn11: Fn<L, M>,
  fn12: Fn<K, L>,
  fn13: Fn<J, K>,
  fn14: Fn<I, J>,
  fn15: Fn<H, I>,
  fn16: Fn<G, H>,
  fn17: Fn<F, G>,
  fn18: Fn<E, F>,
  fn19: Fn<D, E>,
  fn20: Fn<C, D>,
  fn21: Fn<B, C>,
  fn22: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W>(
  fn1: Fn<W, R>,
  fn2: Fn<V, W>,
  fn3: Fn<U, V>,
  fn4: Fn<T, U>,
  fn5: Fn<S, T>,
  fn6: Fn<R, S>,
  fn7: Fn<Q, R>,
  fn8: Fn<P, Q>,
  fn9: Fn<O, P>,
  fn10: Fn<N, O>,
  fn11: Fn<M, N>,
  fn12: Fn<L, M>,
  fn13: Fn<K, L>,
  fn14: Fn<J, K>,
  fn15: Fn<I, J>,
  fn16: Fn<H, I>,
  fn17: Fn<G, H>,
  fn18: Fn<F, G>,
  fn19: Fn<E, F>,
  fn20: Fn<D, E>,
  fn21: Fn<C, D>,
  fn22: Fn<B, C>,
  fn23: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X>(
  fn1: Fn<X, R>,
  fn2: Fn<W, X>,
  fn3: Fn<V, W>,
  fn4: Fn<U, V>,
  fn5: Fn<T, U>,
  fn6: Fn<S, T>,
  fn7: Fn<R, S>,
  fn8: Fn<Q, R>,
  fn9: Fn<P, Q>,
  fn10: Fn<O, P>,
  fn11: Fn<N, O>,
  fn12: Fn<M, N>,
  fn13: Fn<L, M>,
  fn14: Fn<K, L>,
  fn15: Fn<J, K>,
  fn16: Fn<I, J>,
  fn17: Fn<H, I>,
  fn18: Fn<G, H>,
  fn19: Fn<F, G>,
  fn20: Fn<E, F>,
  fn21: Fn<D, E>,
  fn22: Fn<C, D>,
  fn23: Fn<B, C>,
  fn24: Fn<A, B>
): Fn<A, R>;
export function compose<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y>(
  fn1: Fn<Y, R>,
  fn2: Fn<X, Y>,
  fn3: Fn<W, X>,
  fn4: Fn<V, W>,
  fn5: Fn<U, V>,
  fn6: Fn<T, U>,
  fn7: Fn<S, T>,
  fn8: Fn<R, S>,
  fn9: Fn<Q, R>,
  fn10: Fn<P, Q>,
  fn11: Fn<O, P>,
  fn12: Fn<N, O>,
  fn13: Fn<M, N>,
  fn14: Fn<L, M>,
  fn15: Fn<K, L>,
  fn16: Fn<J, K>,
  fn17: Fn<I, J>,
  fn18: Fn<H, I>,
  fn19: Fn<G, H>,
  fn20: Fn<F, G>,
  fn21: Fn<E, F>,
  fn22: Fn<D, E>,
  fn23: Fn<C, D>,
  fn24: Fn<B, C>,
  fn25: Fn<A, B>
): Fn<A, R>;
export function compose<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z
>(
  fn1: Fn<Z, R>,
  fn2: Fn<Y, Z>,
  fn3: Fn<X, Y>,
  fn4: Fn<W, X>,
  fn5: Fn<V, W>,
  fn6: Fn<U, V>,
  fn7: Fn<T, U>,
  fn8: Fn<S, T>,
  fn9: Fn<R, S>,
  fn10: Fn<Q, R>,
  fn11: Fn<P, Q>,
  fn12: Fn<O, P>,
  fn13: Fn<N, O>,
  fn14: Fn<M, N>,
  fn15: Fn<L, M>,
  fn16: Fn<K, L>,
  fn17: Fn<J, K>,
  fn18: Fn<I, J>,
  fn19: Fn<H, I>,
  fn20: Fn<G, H>,
  fn21: Fn<F, G>,
  fn22: Fn<E, F>,
  fn23: Fn<D, E>,
  fn24: Fn<C, D>,
  fn25: Fn<B, C>,
  fn26: Fn<A, B>
): Fn<A, R>;
export function compose(...fns: Fn<unknown, unknown>[]) {
  return (x: unknown) => fns.reduceRight((v, f) => f(v), x);
}
