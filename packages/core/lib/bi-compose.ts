/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
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
