import { pipe } from "@oofp/core/pipe";
import { URIS } from "../hkt";
import { collect } from "./collect";
import { Focal } from "./types";

export const has =
	<S>(s: S) =>
	<F extends URIS, A>(focal: Focal<F, S, A>): boolean =>
		pipe(focal, collect(s), (n) => n.length > 0);
