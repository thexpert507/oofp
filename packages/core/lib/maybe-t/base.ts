/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind, URIS } from "@/URIS";
import { Fn } from "@/function";
import * as M from "../maybe";
import { Monad } from "../monad";
import { pipe } from "@/pipe";

export interface MaybeT<F extends URIS> {
  lift: <A>(ma: Kind<F, A>) => Kind<F, M.Maybe<A>>;
  map: <A, B>(f: Fn<A, B>) => (as: Kind<F, M.Maybe<A>>) => Kind<F, M.Maybe<B>>;
  chain: <A, B>(f: Fn<A, Kind<F, M.Maybe<B>>>) => (as: Kind<F, M.Maybe<A>>) => Kind<F, M.Maybe<B>>;
}

export const base = <F extends URIS>(mo: Monad<F>): MaybeT<F> => ({
  lift: mo.map(M.of),
  map: <A, B>(f: Fn<A, B>) => mo.map(M.map(f)),
  chain:
    <A, B>(f: Fn<A, Kind<F, M.Maybe<B>>>) =>
    (as: Kind<F, M.Maybe<A>>) => {
      return pipe(as, mo.chain(M.fold(() => mo.of(M.nothing<B>()), f)));
    },
});
