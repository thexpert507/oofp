import * as L from "@oofp/core/list";
import { pipe } from "@oofp/core/pipe";
import { URIS } from "../hkt";
import { collect } from "./collect";
import { Focal } from "./types";

export const count =
	<S>(s: S) =>
	<F extends URIS, A>(focal: Focal<F, S, A>): number =>
		pipe(focal, collect(s), L.size);
