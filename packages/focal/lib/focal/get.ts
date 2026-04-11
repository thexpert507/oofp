import * as Iso from "../iso";
import * as Lens from "../lens";
import { Focal } from "./types";

export const get =
	<S>(s: S) =>
	<A>(focal: Focal<Lens.URI | Iso.URI, S, A>): A => {
		const optic = focal.optic;
		if (optic.tag === "Lens") return (optic as Lens.Lens<S, A>).get(s);
		return (optic as Iso.Iso<S, A>).to(s);
	};
