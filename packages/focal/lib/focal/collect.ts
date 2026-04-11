import * as M from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";
import * as Iso from "../iso";
import * as Lens from "../lens";
import * as Prism from "../prism";
import * as Traversal from "../traversal";
import { URIS } from "../hkt";
import { Focal } from "./types";

export const collect =
	<S>(s: S) =>
	<F extends URIS, A>(focal: Focal<F, S, A>): A[] => {
		switch (focal.optic.tag) {
			case "Lens":
				return [pipe(focal.optic as Lens.Lens<S, A>, Lens.view(s))];
			case "Prism":
				return pipe(
					focal.optic as Prism.Prism<S, A>,
					Prism.preview(s),
					M.map((a) => [a]),
					M.getOrElse([] as A[]),
				);
			case "Iso":
				return [pipe(focal.optic as Iso.Iso<S, A>, Iso.view(s))];
			case "Traversal":
				return pipe(focal.optic as Traversal.Traversal<S, A>, Traversal.collect(s));
			default:
				throw new Error("Unsupported optic type");
		}
	};
