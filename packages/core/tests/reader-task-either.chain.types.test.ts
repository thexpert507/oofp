/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expectTypeOf } from "vitest";
import * as RTE from "@/reader-task-either";
import * as TE from "@/task-either";
import { pipe } from "@/pipe";

type DomainErr = { readonly _tag: "Domain" };
type ApiErr = { readonly _tag: "Api"; readonly code: number };
type CtxA = { readonly db: string };
type CtxB = { readonly logger: string };

const domainRte = (): RTE.ReaderTaskEither<CtxA, DomainErr, number> => () =>
	TE.of(1) as TE.TaskEither<DomainErr, number>;

describe("ReaderTaskEither chain types", () => {
	it("RTE.of infers E as never", () => {
		expectTypeOf(RTE.of<CtxA, number, never>(1)).toEqualTypeOf<
			RTE.ReaderTaskEither<CtxA, never, number>
		>();
		expectTypeOf(RTE.of<CtxA, number>(1)).toEqualTypeOf<RTE.ReaderTaskEither<CtxA, never, number>>();
	});

	it("RTE.right keeps E open on ReaderTaskEither", () => {
		expectTypeOf(RTE.right<CtxA, unknown, number>(1)).toEqualTypeOf<
			RTE.ReaderTaskEither<CtxA, unknown, number>
		>();
	});

	it("chain preserves DomainErr when callback uses RTE.of", () => {
		const result = pipe(
			domainRte(),
			RTE.chain((n) => RTE.of<CtxA, string, never>(String(n))),
		);
		expectTypeOf(result).toEqualTypeOf<RTE.ReaderTaskEither<CtxA, DomainErr, string>>();
	});

	it("chain with RTE.of without E annotation infers never in step", () => {
		const result = pipe(
			domainRte(),
			RTE.chain((n) => RTE.of(String(n))),
		);
		expectTypeOf(result).toEqualTypeOf<RTE.ReaderTaskEither<CtxA, DomainErr, string>>();
	});

	it("chainwc merges context when using RTE.of in callback", () => {
		const result = pipe(
			RTE.of<CtxA, number, never>(1),
			RTE.chainwc((n) => RTE.of<CtxB, string, never>(String(n))),
		);
		expectTypeOf(result).toEqualTypeOf<RTE.ReaderTaskEither<CtxA & CtxB, never, string>>();
	});

	it("chaint widens error from TaskEither", () => {
		const result = pipe(
			domainRte(),
			RTE.chaint((n) => TE.left<ApiErr, never>({ _tag: "Api", code: n })),
		);
		expectTypeOf(result).toEqualTypeOf<RTE.ReaderTaskEither<CtxA, DomainErr | ApiErr, never>>();
	});

	it("provideTE with TE.of infers E0 as never", () => {
		const rte = RTE.ask<CtxA & CtxB>();
		const provided = RTE.provideTE(TE.of({ logger: "x" }))(rte);
		expectTypeOf(provided).toEqualTypeOf<RTE.ReaderTaskEither<CtxA, never, CtxA & CtxB>>();
	});
});
