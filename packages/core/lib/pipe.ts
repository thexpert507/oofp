/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

type Fn<A, B> = (a: A) => B;

export function pipe<A, R>(value: A, fn: Fn<A, R>): R;
export function pipe<A, B, R>(value: A, fn1: Fn<A, B>, fn2: Fn<B, R>): R;
export function pipe<A, B, C, R>(value: A, fn1: Fn<A, B>, fn2: Fn<B, C>, fn3: Fn<C, R>): R;
export function pipe<A, B, C, D, R>(
  value: A,
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, R>
): R;
export function pipe<A, B, C, D, E, R>(
  value: A,
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, E>,
  fn5: Fn<E, R>
): R;
export function pipe<A, B, C, D, E, F, R>(
  value: A,
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, E>,
  fn5: Fn<E, F>,
  fn6: Fn<F, R>
): R;
export function pipe<A, B, C, D, E, F, G, R>(
  value: A,
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, E>,
  fn5: Fn<E, F>,
  fn6: Fn<F, G>,
  fn7: Fn<G, R>
): R;
export function pipe<A, B, C, D, E, F, G, H, R>(
  value: A,
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, E>,
  fn5: Fn<E, F>,
  fn6: Fn<F, G>,
  fn7: Fn<G, H>,
  fn8: Fn<H, R>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, R>(
  value: A,
  fn1: Fn<A, B>,
  fn2: Fn<B, C>,
  fn3: Fn<C, D>,
  fn4: Fn<D, E>,
  fn5: Fn<E, F>,
  fn6: Fn<F, G>,
  fn7: Fn<G, H>,
  fn8: Fn<H, I>,
  fn9: Fn<I, R>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, R>(
  value: A,
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
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, R>(
  value: A,
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
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, R>(
  value: A,
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
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, R>(
  value: A,
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
  fn12: Fn<L, M>,
  fn13: Fn<M, R>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, R>(
  value: A,
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
  fn12: Fn<L, M>,
  fn13: Fn<M, N>,
  fn14: Fn<N, R>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, R>(
  value: A,
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
  fn12: Fn<L, M>,
  fn13: Fn<M, N>,
  fn14: Fn<N, O>,
  fn15: Fn<O, R>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, R>(
  value: A,
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
  fn12: Fn<L, M>,
  fn13: Fn<M, N>,
  fn14: Fn<N, O>,
  fn15: Fn<O, P>,
  fn16: Fn<P, R>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
  value: A,
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
  fn12: Fn<L, M>,
  fn13: Fn<M, N>,
  fn14: Fn<N, O>,
  fn15: Fn<O, P>,
  fn16: Fn<P, Q>,
  fn17: Fn<Q, R>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
  value: A,
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
  fn12: Fn<L, M>,
  fn13: Fn<M, N>,
  fn14: Fn<N, O>,
  fn15: Fn<O, P>,
  fn16: Fn<P, Q>,
  fn17: Fn<Q, R>,
  fn18: Fn<R, S>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
  value: A,
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
  fn12: Fn<L, M>,
  fn13: Fn<M, N>,
  fn14: Fn<N, O>,
  fn15: Fn<O, P>,
  fn16: Fn<P, Q>,
  fn17: Fn<Q, R>,
  fn18: Fn<R, S>,
  fn19: Fn<S, T>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(
  value: A,
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
  fn12: Fn<L, M>,
  fn13: Fn<M, N>,
  fn14: Fn<N, O>,
  fn15: Fn<O, P>,
  fn16: Fn<P, Q>,
  fn17: Fn<Q, R>,
  fn18: Fn<R, S>,
  fn19: Fn<S, T>,
  fn20: Fn<T, U>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V>(
  value: A,
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
  fn12: Fn<L, M>,
  fn13: Fn<M, N>,
  fn14: Fn<N, O>,
  fn15: Fn<O, P>,
  fn16: Fn<P, Q>,
  fn17: Fn<Q, R>,
  fn18: Fn<R, S>,
  fn19: Fn<S, T>,
  fn20: Fn<T, U>,
  fn21: Fn<U, V>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W>(
  value: A,
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
  fn12: Fn<L, M>,
  fn13: Fn<M, N>,
  fn14: Fn<N, O>,
  fn15: Fn<O, P>,
  fn16: Fn<P, Q>,
  fn17: Fn<Q, R>,
  fn18: Fn<R, S>,
  fn19: Fn<S, T>,
  fn20: Fn<T, U>,
  fn21: Fn<U, V>,
  fn22: Fn<V, W>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X>(
  value: A,
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
  fn12: Fn<L, M>,
  fn13: Fn<M, N>,
  fn14: Fn<N, O>,
  fn15: Fn<O, P>,
  fn16: Fn<P, Q>,
  fn17: Fn<Q, R>,
  fn18: Fn<R, S>,
  fn19: Fn<S, T>,
  fn20: Fn<T, U>,
  fn21: Fn<U, V>,
  fn22: Fn<V, W>,
  fn23: Fn<W, X>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y>(
  value: A,
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
  fn12: Fn<L, M>,
  fn13: Fn<M, N>,
  fn14: Fn<N, O>,
  fn15: Fn<O, P>,
  fn16: Fn<P, Q>,
  fn17: Fn<Q, R>,
  fn18: Fn<R, S>,
  fn19: Fn<S, T>,
  fn20: Fn<T, U>,
  fn21: Fn<U, V>,
  fn22: Fn<V, W>,
  fn23: Fn<W, X>,
  fn24: Fn<X, Y>
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z>(
  value: A,
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
  fn12: Fn<L, M>,
  fn13: Fn<M, N>,
  fn14: Fn<N, O>,
  fn15: Fn<O, P>,
  fn16: Fn<P, Q>,
  fn17: Fn<Q, R>,
  fn18: Fn<R, S>,
  fn19: Fn<S, T>,
  fn20: Fn<T, U>,
  fn21: Fn<U, V>,
  fn22: Fn<V, W>,
  fn23: Fn<W, X>,
  fn24: Fn<X, Y>,
  fn25: Fn<Y, Z>
): R;
export function pipe(value: unknown, ...fns: Fn<unknown, unknown>[]) {
  return fns.reduce((v, f) => f(v), value);
}
