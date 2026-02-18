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
import { Kind, URIS } from "./URIS.ts";
import { Kind3, URIS3 } from "./URIS3.ts";

export interface Pointed<F extends URIS> {
  of: <A>(a: A) => Kind<F, A>;
}

export interface Pointed2<F extends URIS2> {
  readonly of: <E, A>(value: A) => Kind2<F, E, A>;
}

export interface Pointed3<F extends URIS3> {
  readonly of: <R, E, A>(value: A) => Kind3<F, R, E, A>;
}
