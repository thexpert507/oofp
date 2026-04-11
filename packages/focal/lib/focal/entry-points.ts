import * as Iso from "../iso";
import * as Lens from "../lens";
import * as Prism from "../prism";
import * as Traversal from "../traversal";
import { Kind, URIS } from "../hkt";
import { make } from "./internal";
import { Focal } from "./types";

export const from = <S>(): Focal<Lens.URI, S, S> => make<Lens.URI, S, S>(Lens.identity<S>());

export const fromEach = <A>(): Focal<Traversal.URI, A[], A> =>
	make<Traversal.URI, A[], A>(Traversal.each<A>());

export function fromOptic<S, A>(optic: Lens.Lens<S, A>): Focal<Lens.URI, S, A>;
export function fromOptic<S, A>(optic: Prism.Prism<S, A>): Focal<Prism.URI, S, A>;
export function fromOptic<S, A>(optic: Iso.Iso<S, A>): Focal<Iso.URI, S, A>;
export function fromOptic<S, A>(optic: Traversal.Traversal<S, A>): Focal<Traversal.URI, S, A>;
export function fromOptic<S, A>(
	optic: Lens.Lens<S, A> | Prism.Prism<S, A> | Iso.Iso<S, A> | Traversal.Traversal<S, A>,
): Focal<URIS, S, A> {
	return make(optic as Kind<URIS, S, A>);
}

export const toOptic = <F extends URIS, S, A>(focal: Focal<F, S, A>): Kind<F, S, A> => focal.optic;
