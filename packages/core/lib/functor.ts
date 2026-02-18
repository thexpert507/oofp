/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind2, URIS2 } from "@/URIS2";
import { Fn } from "./function.ts";
import { Kind, URIS } from "./URIS.ts";
import { Kind3, URIS3 } from "./URIS3.ts";

export interface Functor<F extends URIS> {
  map: <A, B>(f: Fn<A, B>) => (as: Kind<F, A>) => Kind<F, B>;
}

export interface Functor2<F extends URIS2> {
  map: <A, B>(f: Fn<A, B>) => <E>(as: Kind2<F, E, A>) => Kind2<F, E, B>;
}

export interface Functor3<F extends URIS3> {
  map: <R, E, A, B>(f: Fn<A, B>) => (as: Kind3<F, R, E, A>) => Kind3<F, R, E, B>;
}

export interface BiFunctor2<F extends URIS2> extends Functor2<F> {
  bimap: <E, A, E2, B>(f: Fn<E, E2>, g: Fn<A, B>) => (as: Kind2<F, E, A>) => Kind2<F, E2, B>;
}
