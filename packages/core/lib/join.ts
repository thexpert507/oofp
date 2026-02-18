/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind, URIS } from "@/URIS";
import { Kind2, URIS2 } from "@/URIS2";
import { Kind3, URIS3 } from "./URIS3";

export interface Joinable<F extends URIS> {
  readonly join: <A>(mma: Kind<F, Kind<F, A>>) => Kind<F, A>;
}

export interface Joinable2<F extends URIS2> {
  readonly join: <E, A>(mma: Kind2<F, E, Kind2<F, E, A>>) => Kind2<F, E, A>;
}

export interface Joinable3<F extends URIS3> {
  readonly join: <R, E, A>(mma: Kind3<F, R, E, Kind3<F, R, E, A>>) => Kind3<F, R, E, A>;
}
