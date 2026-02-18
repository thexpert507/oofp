/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { URIS2 } from '@/URIS2'
import { URIS3 } from '@/URIS3'
import { Kind2 } from '@/URIS2'
import { Kind3 } from '@/URIS3'

export interface BiPointed2<F extends URIS2> {
  readonly URI: F
  readonly left: <E = never, A = never>(e: E) => Kind2<F, E, A>
  readonly right: <E = never, A = never>(a: A) => Kind2<F, E, A>
}

export interface BiPointed3<F extends URIS3> {
  readonly URI: F
  readonly left: <R = unknown, E = never, A = never>(e: E) => Kind3<F, R, E, A>
  readonly right: <R = unknown, E = never, A = never>(a: A) => Kind3<F, R, E, A>
}
