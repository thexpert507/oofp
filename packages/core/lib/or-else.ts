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
