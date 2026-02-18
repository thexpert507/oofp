/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
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
