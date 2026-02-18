/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind2, URIS2 } from "@/URIS2";
import { Fn } from "@/function";
import * as M from "../maybe";
import { Monad2 } from "@/monad";

export interface MaybeT2<F extends URIS2> {
  lift: <E, A>(ma: Kind2<F, E, A>) => Kind2<F, E, M.Maybe<A>>;
  map: <A, B>(f: Fn<A, B>) => <E>(ma: Kind2<F, E, M.Maybe<A>>) => Kind2<F, E, M.Maybe<B>>;
}

export const base2 = <F extends URIS2>(mo: Monad2<F>): MaybeT2<F> => ({
  lift: <E, A>(ma: Kind2<F, E, A>) => mo.map<A, M.Maybe<A>>(M.of)(ma),
  map: <A, B>(f: Fn<A, B>) => mo.map(M.map(f)),
});
