import { pipe } from "@oofp/core/pipe";
import { URIS } from "../hkt";
import { call } from "./internal";
import { modify } from "./modify";
import { Focal } from "./types";

export const set =
	<A>(a: A) =>
	<F extends URIS, S>(focal: Focal<F, S, A>) =>
	(s: S): S =>
		pipe(
			focal,
			modify(() => a),
			call(s),
		);
