/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
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
