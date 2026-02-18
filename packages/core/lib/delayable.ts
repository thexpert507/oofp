/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
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
