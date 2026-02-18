/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
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
