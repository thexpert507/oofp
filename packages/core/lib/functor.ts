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
