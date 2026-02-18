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
