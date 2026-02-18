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
import { Fn } from "./function";
import { Kind2, URIS2 } from "@/URIS2";
import { Kind3, URIS3 } from "./URIS3";

export interface Applicative<F extends URIS> {
  apply: <A, B>(fab: Kind<F, Fn<A, B>>) => (fa: Kind<F, A>) => Kind<F, B>;
}

export interface Applicative2<F extends URIS2> {
  apply: <E, A, B>(fab: Kind2<F, E, Fn<A, B>>) => (fa: Kind2<F, E, A>) => Kind2<F, E, B>;
}

export interface Applicative3<F extends URIS3> {
  apply: <R, E, A, B>(
    fab: Kind3<F, R, E, Fn<A, B>>
  ) => (fa: Kind3<F, R, E, A>) => Kind3<F, R, E, B>;
}
