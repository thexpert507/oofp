import * as Traversal from "../traversal";
import { Focal, Iso, Lens, Prism, URIS } from "../index";
import type { Focal as IFocal } from "../focal/types";
import { ArrayKeys } from "@/focal/each";
import { pipe } from "@oofp/core/pipe";
import { NullablePaths, OptionalKeys, SafePaths } from "@/path-types";
import { PendingUpdate } from "./pending-update";
import { Fn, Fn2 } from "@oofp/core/function";
import { RecordKeys } from "@/focal/eachRecord";
import { StripIndex, TagValues } from "@/prism";
import { LensBuilder } from "./lens-builder";
import { IsoBuilder } from "./iso-builder";
import { PrismBuilder } from "./prism-builder";
import type { Maybe } from "@oofp/core/maybe";

export class TraversalBuilder<S, A> {
	constructor(public readonly focal: IFocal<Traversal.URI, S, A>) {}

	each<Key extends ArrayKeys<A>>(key: Key) {
		return new TraversalBuilder(pipe(this.focal, Focal.each(key)));
	}

	eachRecord<Key extends RecordKeys<A>>(key: Key) {
		return new TraversalBuilder(pipe(this.focal, Focal.eachRecord(key)));
	}

	elements(this: TraversalBuilder<S, A[]>): TraversalBuilder<S, A> {
		return new TraversalBuilder(pipe(this.focal, Focal.elements()));
	}

	prop<Key extends SafePaths<A>>(key: Key) {
		return new TraversalBuilder(pipe(this.focal, Focal.prop(key)));
	}

	optional<Key extends NullablePaths<A>>(key: Key) {
		return new TraversalBuilder(pipe(this.focal, Focal.optional(key)));
	}

	optionalProp<K extends OptionalKeys<A> & string>(key: K) {
		return new TraversalBuilder(pipe(this.focal, Focal.optionalProp(key)));
	}

	match<TK extends keyof StripIndex<A> & string, TV extends string>(
		target: TK,
		value: TV & TagValues<A, TK>,
	): TraversalBuilder<S, Extract<A, Record<TK, TV>>> {
		return new TraversalBuilder(pipe(this.focal, Focal.match(target, value as TV)));
	}

	modify(f: Fn<A, A>): PendingUpdate<S> {
		return pipe(this.focal, Focal.modify(f));
	}

	modifyWith<B>(other: LensBuilder<S, B>, f: Fn2<B, A, A>): PendingUpdate<S>;
	modifyWith<B>(other: IsoBuilder<S, B>, f: Fn2<B, A, A>): PendingUpdate<S>;
	modifyWith<B>(other: PrismBuilder<S, B>, f: Fn2<Maybe<B>, A, A>): PendingUpdate<S>;
	modifyWith<B>(other: TraversalBuilder<S, B>, f: Fn2<B[], A, A>): PendingUpdate<S>;
	modifyWith<B>(other: unknown, f: unknown): PendingUpdate<S> {
		const focal = (other as { focal: IFocal<URIS, S, unknown> }).focal;
		if (focal.optic.tag === Lens.URI || focal.optic.tag === Iso.URI) {
			const focalToCompose = focal as IFocal<Lens.URI | Iso.URI, S, B>;
			const fTyped = f as Fn2<B, A, A>;
			return pipe(this.focal, Focal.modifyWith(focalToCompose, fTyped));
		}
		if (focal.optic.tag === Prism.URI) {
			const focalToCompose = focal as IFocal<Prism.URI, S, B>;
			const fTyped = f as Fn2<Maybe<B>, A, A>;
			return pipe(this.focal, Focal.modifyWith(focalToCompose, fTyped));
		}
		if (focal.optic.tag === Traversal.URI) {
			const focalToCompose = focal as IFocal<Traversal.URI, S, B>;
			const fTyped = f as Fn2<B[], A, A>;
			return pipe(this.focal, Focal.modifyWith(focalToCompose, fTyped));
		}
		throw new Error("Invalid optic kind for modifyWith");
	}

	filter(pred: Fn<A, boolean>): TraversalBuilder<S, A> {
		return new TraversalBuilder(pipe(this.focal, Focal.filter(pred)));
	}

	set(a: A): PendingUpdate<S> {
		return pipe(this.focal, Focal.set(a));
	}

	collect(s: S): A[] {
		return pipe(this.focal, Focal.collect(s));
	}

	find(pred: Fn<A, boolean>) {
		return pipe(this.focal, Focal.find(pred));
	}

	first<Elem>(this: TraversalBuilder<S, Elem[]>, pred: Fn<Elem, boolean>) {
		return new TraversalBuilder(pipe(this.focal, Focal.first(pred)));
	}

	fold<B>(init: B, f: (acc: B, a: A) => B) {
		return pipe(this.focal, Focal.fold(init, f));
	}

	index<Elem>(this: TraversalBuilder<S, Elem[]>, i: number) {
		return new TraversalBuilder(pipe(this.focal, Focal.index(i)));
	}

	indexRecord<Elem>(this: TraversalBuilder<S, Record<string, Elem>>, key: string) {
		return new TraversalBuilder(pipe(this.focal, Focal.indexRecord(key)));
	}

	count(s: S): number {
		return pipe(this.focal, Focal.count(s));
	}

	has(s: S): boolean {
		return pipe(this.focal, Focal.has(s));
	}

	toOptic() {
		return this.focal.optic;
	}
}
