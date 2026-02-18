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

import { Monad } from "@/monad.ts";
import { Monad2 } from "@/monad.ts";
import { base, MaybeT } from "./base";
import { base2, MaybeT2 } from "./base2";
import { URIS } from "@/URIS";
import { Applicative } from "@/applicative";
import { URIS2 } from "@/URIS2";
import { Applicative2 } from "@/applicative";

type Instance<F extends URIS> = Monad<F> & Applicative<F>;
type Instance2<F extends URIS2> = Monad2<F> & Applicative2<F>;

export function maybeT<F extends URIS>(mo: Instance<F>): MaybeT<F>;
export function maybeT<F extends URIS2>(mo: Instance2<F>): MaybeT2<F>;
export function maybeT(mo: Monad<any> | Monad2<any>): any {
  return "bimap" in mo ? base2(mo) : base(mo);
}
