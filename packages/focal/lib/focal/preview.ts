import type { Maybe } from "@oofp/core/maybe";
import * as Prism from "../prism";
import { Focal } from "./types";

export const preview =
	<S>(s: S) =>
	<A>(focal: Focal<Prism.URI, S, A>): Maybe<A> =>
		(focal.optic as Prism.Prism<S, A>).preview(s);
