import { pipe } from "@oofp/core/pipe";
import * as Iso from "../iso";
import * as Lens from "../lens";
import * as Prism from "../prism";
import * as Traversal from "../traversal";
import { URIS } from "../hkt";
import { call } from "./internal";
import { Focal } from "./types";

export const modify =
	<A>(f: (a: A) => A) =>
	<F extends URIS, S>(focal: Focal<F, S, A>) =>
	(s: S): S => {
		const optic = focal.optic;
		switch (optic.tag) {
			case "Lens":
				return pipe(optic as Lens.Lens<S, A>, Lens.modify(f), call(s));
			case "Prism":
				return pipe(optic as Prism.Prism<S, A>, Prism.modify(f), call(s));
			case "Iso":
				return pipe(optic as Iso.Iso<S, A>, Iso.modify(f), call(s));
			case "Traversal":
				return pipe(optic as Traversal.Traversal<S, A>, Traversal.modify(f), call(s));
			default:
				throw new Error("Unsupported optic type");
		}
	};
