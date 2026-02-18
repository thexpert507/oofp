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
