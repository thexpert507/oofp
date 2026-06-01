/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expectTypeOf } from "vitest";
import * as TE from "@/task-either";
import { pipe } from "@/pipe";

type DomainErr = { readonly _tag: "Domain" };
type ApiErr = { readonly _tag: "Api"; readonly code: number };

const domainTe = (): TE.TaskEither<DomainErr, number> => () =>
	Promise.resolve({ tag: "Right" as const, value: 1 });

describe("TaskEither chain / chainw types", () => {
	it("TE.of infers E as never", () => {
		expectTypeOf(TE.of(42)).toEqualTypeOf<TE.TaskEither<never, number>>();
	});

	it("TE.of allows explicit E opt-in", () => {
		expectTypeOf(TE.of<string, ApiErr>("x")).toEqualTypeOf<TE.TaskEither<ApiErr, string>>();
	});

	it("TE.right keeps E open (unknown without context)", () => {
		expectTypeOf(TE.right("x")).toEqualTypeOf<TE.TaskEither<unknown, string>>();
	});

	it("chainw preserves DomainErr when callback uses TE.of", () => {
		const result = pipe(
			domainTe(),
			TE.chainw((n) => TE.of(String(n))),
		);
		expectTypeOf(result).toEqualTypeOf<TE.TaskEither<DomainErr, string>>();
	});

	it("chainw with TE.right poisons E to unknown without context", () => {
		const result = pipe(
			domainTe(),
			TE.chainw((n) => TE.right(String(n))),
		);
		expectTypeOf(result).toEqualTypeOf<TE.TaskEither<unknown, string>>();
		expectTypeOf(result).not.toEqualTypeOf<TE.TaskEither<DomainErr, string>>();
	});

	it("chainw unions errors when callback uses TE.left", () => {
		const result = pipe(
			domainTe(),
			TE.chainw((n) => TE.left<ApiErr, never>({ _tag: "Api", code: n })),
		);
		expectTypeOf(result).toEqualTypeOf<TE.TaskEither<DomainErr | ApiErr, never>>();
	});

	it("chain keeps E when callback uses TE.of", () => {
		const result = pipe(
			domainTe(),
			TE.chain((n) => TE.of(String(n))),
		);
		expectTypeOf(result).toEqualTypeOf<TE.TaskEither<DomainErr, string>>();
	});
});
