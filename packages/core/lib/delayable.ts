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
import { Kind2, URIS2 } from "@/URIS2";
import { Kind3, URIS3 } from "@/URIS3";

export interface Delayable<F extends URIS> {
  delay: <A>(ms: number) => (fa: Kind<F, A>) => Kind<F, A>;
}

export interface Delayable2<F extends URIS2> {
  delay: <A>(ms: number) => <E>(fa: Kind2<F, E, A>) => Kind2<F, E, A>;
}

export interface Delayable3<F extends URIS3> {
  delay: <A>(ms: number) => <R, E>(fa: Kind3<F, R, E, A>) => Kind3<F, R, E, A>;
}
