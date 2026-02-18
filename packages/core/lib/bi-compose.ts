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

import { BiFunctor2 } from "./functor.ts";
import { Fn } from "./function.ts";
import { Functor } from "./functor.ts";
import { Kind, URIS } from "./URIS.ts";
import { Kind2, URIS2 } from "./URIS2.ts";

export type Bicompose<F extends URIS2, FA extends URIS, FB extends URIS> = {
  bimap: <A, B, C, D>(
    f: Fn<A, C>,
    g: Fn<B, D>
  ) => (as: Kind2<F, Kind<FA, A>, Kind<FB, B>>) => Kind2<F, Kind<FA, C>, Kind<FB, D>>;
};

export const bicompose = <F extends URIS2, FA extends URIS, FB extends URIS>(
  bifunctor: BiFunctor2<F>,
  fa: Functor<FA>,
  fb: Functor<FB>
): Bicompose<F, FA, FB> => ({
  bimap:
    <A, B, C, D>(f: Fn<A, C>, g: Fn<B, D>) =>
    (as: Kind2<F, Kind<FA, A>, Kind<FB, B>>) =>
      bifunctor.bimap(fa.map(f), fb.map(g))(as),
});
