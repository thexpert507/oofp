/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Kind2, URIS2 } from "@/URIS2";
import { Fn } from "./function.ts";

export interface ProFunctor<F extends URIS2> {
	readonly dimap: <E1, A, E2, B>(
		f1: Fn<E2, E1>,
		f2: Fn<A, B>,
	) => (fa: Kind2<F, E1, A>) => Kind2<F, E2, B>;
	readonly lmap: <E1, A, E2>(f: Fn<E2, E1>) => (fa: Kind2<F, E1, A>) => Kind2<F, E2, A>;
	readonly rmap: <E, A, B>(f: Fn<A, B>) => (fa: Kind2<F, E, A>) => Kind2<F, E, B>;
}
