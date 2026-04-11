import { Kind, URIS } from "../hkt";
import { Focal } from "./types";

export const call =
	<A>(a: A) =>
	<B>(f: (a: A) => B) =>
		f(a);

export const make = <F extends URIS, S, A>(optic: Kind<F, S, A>): Focal<F, S, A> => ({
	tag: "Focal",
	optic,
});
