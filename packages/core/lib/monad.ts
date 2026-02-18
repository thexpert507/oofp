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

import { URIS } from "./URIS.ts";
import { URIS2 } from "@/URIS2";
import { Chain, Chain2, Chain3 } from "./chain.ts";
import { Functor, Functor2, Functor3 } from "./functor.ts";
import { Pointed, Pointed2, Pointed3 } from "./pointed.ts";
import { Joinable, Joinable2, Joinable3 } from "./join.ts";
import { URIS3 } from "./URIS3.ts";

export interface Monad<F extends URIS> extends Functor<F>, Pointed<F>, Chain<F>, Joinable<F> {
  readonly URI: F;
}

export interface Monad2<F extends URIS2> extends Functor2<F>, Pointed2<F>, Chain2<F>, Joinable2<F> {
  readonly URI: F;
}

export interface Monad3<F extends URIS3> extends Functor3<F>, Pointed3<F>, Chain3<F>, Joinable3<F> {
  readonly URI: F;
}
