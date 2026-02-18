/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { Monad } from "@/monad.ts";
import { Monad2 } from "@/monad.ts";
import { base, MaybeT } from "./base";
import { base2, MaybeT2 } from "./base2";
import { URIS } from "@/URIS";
import { Applicative } from "@/applicative";
import { URIS2 } from "@/URIS2";
import { Applicative2 } from "@/applicative";

type Instance<F extends URIS> = Monad<F> & Applicative<F>;
type Instance2<F extends URIS2> = Monad2<F> & Applicative2<F>;

export function maybeT<F extends URIS>(mo: Instance<F>): MaybeT<F>;
export function maybeT<F extends URIS2>(mo: Instance2<F>): MaybeT2<F>;
export function maybeT(mo: Monad<any> | Monad2<any>): any {
  return "bimap" in mo ? base2(mo) : base(mo);
}
