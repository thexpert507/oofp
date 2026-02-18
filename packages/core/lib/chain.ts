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

export interface Chain<F extends URIS> {
  chain: <A, B>(f: Fn<A, Kind<F, B>>) => (as: Kind<F, A>) => Kind<F, B>;
}

export interface Chain2<F extends URIS2> {
  chain: <L, A, A2>(f: Fn<A, Kind2<F, L, A2>>) => (ma: Kind2<F, L, A>) => Kind2<F, L, A2>;
}

export interface Chain3<F extends URIS3> {
  chain: <R, E, A, B>(f: Fn<A, Kind3<F, R, E, B>>) => (ma: Kind3<F, R, E, A>) => Kind3<F, R, E, B>;
}
