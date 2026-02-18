/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
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
