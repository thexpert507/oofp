import * as EntryPoints from "../focal/entry-points";
import { LensBuilder } from "./lens-builder";
import { TraversalBuilder } from "./traversal-builder";
import { PrismBuilder } from "./prism-builder";
import { IsoBuilder } from "./iso-builder";
import * as L from "../lens";
import * as P from "../prism";
import * as I from "../iso";
import * as T from "../traversal";

const from = <S>() => new LensBuilder(EntryPoints.from<S>());

const fromEach = <A>() => new TraversalBuilder(EntryPoints.fromEach<A>());

function fromOptic<S, A>(optic: L.Lens<S, A>): LensBuilder<S, A>;
function fromOptic<S, A>(optic: P.Prism<S, A>): PrismBuilder<S, A>;
function fromOptic<S, A>(optic: I.Iso<S, A>): IsoBuilder<S, A>;
function fromOptic<S, A>(optic: T.Traversal<S, A>): TraversalBuilder<S, A>;
function fromOptic<S, A>(
	optic: L.Lens<S, A> | P.Prism<S, A> | I.Iso<S, A> | T.Traversal<S, A>,
): LensBuilder<S, A> | PrismBuilder<S, A> | IsoBuilder<S, A> | TraversalBuilder<S, A> {
	if (optic.tag === L.URI) return new LensBuilder(EntryPoints.fromOptic(optic));
	if (optic.tag === P.URI) return new PrismBuilder(EntryPoints.fromOptic(optic));
	if (optic.tag === I.URI) return new IsoBuilder(EntryPoints.fromOptic(optic));
	if (optic.tag === T.URI) return new TraversalBuilder(EntryPoints.fromOptic(optic));
	throw new Error("Invalid optic type");
}

function toOptic<S, A>(focal: LensBuilder<S, A>): L.Lens<S, A>;
function toOptic<S, A>(focal: PrismBuilder<S, A>): P.Prism<S, A>;
function toOptic<S, A>(focal: IsoBuilder<S, A>): I.Iso<S, A>;
function toOptic<S, A>(focal: TraversalBuilder<S, A>): T.Traversal<S, A>;
function toOptic<S, A>(
	focal: LensBuilder<S, A> | PrismBuilder<S, A> | IsoBuilder<S, A> | TraversalBuilder<S, A>,
): L.Lens<S, A> | P.Prism<S, A> | I.Iso<S, A> | T.Traversal<S, A> {
	if (focal instanceof LensBuilder) return EntryPoints.toOptic(focal.focal);
	if (focal instanceof PrismBuilder) return EntryPoints.toOptic(focal.focal);
	if (focal instanceof IsoBuilder) return EntryPoints.toOptic(focal.focal);
	if (focal instanceof TraversalBuilder) return EntryPoints.toOptic(focal.focal);
	throw new Error("Invalid focal type");
}

export const FocalBuilder = { from, fromEach, fromOptic, toOptic };
