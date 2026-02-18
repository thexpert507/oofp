/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { URIS2 } from '@/URIS2'
import { URIS3 } from '@/URIS3'
import { Kind2 } from '@/URIS2'
import { Kind3 } from '@/URIS3'

export interface OrElse2<F extends URIS2> {
  readonly URI: F
  readonly orElse: <E, A, E2>(handler: (e: E) => Kind2<F, E2, A>) => (ma: Kind2<F, E, A>) => Kind2<F, E2, A>
}

export interface OrElse3<F extends URIS3> {
  readonly URI: F
  readonly orElse: <R, E, A, E2>(handler: (e: E) => Kind3<F, R, E2, A>) => (ma: Kind3<F, R, E, A>) => Kind3<F, R, E2, A>
}
