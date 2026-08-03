/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import * as E from "@/either";
import * as M from "@/maybe";
import * as R from "@/reader";
import * as RTE from "@/reader-task-either";
import * as S from "@/state";
import * as T from "@/task";
import * as TE from "@/task-either";
import {
	concurrency2,
	concurrency3,
	concurrencyObject3,
	sequenceObjectT2,
	sequenceObjectT3,
	sequenceT,
	sequenceT2,
	sequenceT3,
} from "@/utils";
import { describe, expectTypeOf, it } from "vitest";

type DomainError = { readonly _tag: "DomainError" };
type ApiError = { readonly _tag: "ApiError"; readonly status: number };
type DatabaseContext = { readonly databaseUrl: string };
type LoggerContext = { readonly log: (message: string) => void };

describe("utility type inference", () => {
	it("preserves heterogeneous tuple values for Kind", () => {
		const result = sequenceT(M.M)([M.just(1), M.just("two")]);

		expectTypeOf(result).toEqualTypeOf<M.Maybe<[number, string]>>();
	});

	it("preserves legacy namespace-style sequenceT calls", () => {
		const taskResult = sequenceT(T)([T.of(1), T.of("two")]);
		const eitherResult = sequenceT(E)([
			E.right<DomainError, number>(1),
			E.right<ApiError, string>("two"),
		]);

		expectTypeOf(taskResult).toEqualTypeOf<T.Task<[number, string]>>();
		expectTypeOf(eitherResult).toEqualTypeOf<E.Either<DomainError | ApiError, [number, string]>>();
	});

	it("unions errors and preserves tuple values for Kind2", () => {
		const first = E.right<DomainError, number>(1);
		const second = E.right<ApiError, string>("two");
		const result = sequenceT2(E.E)([first, second]);

		expectTypeOf(result).toEqualTypeOf<E.Either<DomainError | ApiError, [number, string]>>();
	});

	it("intersects contexts, unions errors, and preserves tuple values for Kind3", () => {
		const first = RTE.of<DatabaseContext, number, DomainError>(1);
		const second = RTE.of<LoggerContext, string, ApiError>("two");
		const result = sequenceT3(RTE.RTE)([first, second]);

		expectTypeOf(result).toEqualTypeOf<
			RTE.ReaderTaskEither<
				DatabaseContext & LoggerContext,
				DomainError | ApiError,
				[number, string]
			>
		>();
	});

	it("preserves object keys and values for Kind3", () => {
		const first = RTE.of<DatabaseContext, number, DomainError>(1);
		const second = RTE.of<LoggerContext, string, ApiError>("two");
		const result = sequenceObjectT3(RTE.RTE)({ first, second });

		expectTypeOf(result).toEqualTypeOf<
			RTE.ReaderTaskEither<
				DatabaseContext & LoggerContext,
				DomainError | ApiError,
				{ first: number; second: string }
			>
		>();
	});

	it("preserves tuple inference through concurrency", () => {
		const first = RTE.of<DatabaseContext, number, DomainError>(1);
		const second = RTE.of<LoggerContext, string, ApiError>("two");
		const result = concurrency3(RTE.RTE)()([first, second]);

		expectTypeOf(result).toEqualTypeOf<
			RTE.ReaderTaskEither<
				DatabaseContext & LoggerContext,
				DomainError | ApiError,
				[number, string]
			>
		>();
	});

	it("preserves object inference through concurrency", () => {
		const first = RTE.of<DatabaseContext, number, DomainError>(1);
		const second = RTE.of<LoggerContext, string, ApiError>("two");
		const result = concurrencyObject3(RTE.RTE)()({ first, second });

		expectTypeOf(result).toEqualTypeOf<
			RTE.ReaderTaskEither<
				DatabaseContext & LoggerContext,
				DomainError | ApiError,
				{ first: number; second: string }
			>
		>();
	});

	it("keeps each settled TaskEither result type", () => {
		const first = TE.of<number, DomainError>(1);
		const second = TE.of<string, ApiError>("two");
		const result = TE.concurrentSettled()([first, second]);

		expectTypeOf(result).toEqualTypeOf<
			TE.TaskEither<never, [E.Either<DomainError, number>, E.Either<ApiError, string>]>
		>();
	});

	it("keeps contexts and each settled ReaderTaskEither result type", () => {
		const first = RTE.of<DatabaseContext, number, DomainError>(1);
		const second = RTE.of<LoggerContext, string, ApiError>("two");
		const result = RTE.concurrentSettled()([first, second]);

		expectTypeOf(result).toEqualTypeOf<
			RTE.ReaderTaskEither<
				DatabaseContext & LoggerContext,
				never,
				[E.Either<DomainError, number>, E.Either<ApiError, string>]
			>
		>();
	});

	it("rejects values that do not belong to the selected HKT", () => {
		const task = RTE.of<DatabaseContext, number, DomainError>(1);

		// @ts-expect-error plain values are not ReaderTaskEither values
		sequenceT3(RTE.RTE)([task, 2]);
		// @ts-expect-error plain values are not ReaderTaskEither values
		sequenceObjectT3(RTE.RTE)({ task, invalid: "value" });
	});

	it("supports contravariant Reader inputs", () => {
		const first = R.of<string, number>(1);
		const second = R.of<string, string>("two");
		const result = sequenceObjectT2(R.R)({ first, second });

		expectTypeOf(result).toEqualTypeOf<R.Reader<string, { first: number; second: string }>>();
	});

	it("supports invariant State inputs", () => {
		const first = S.of<string, number>(1);
		const second = S.of<string, string>("two");
		const stateWithDelay = {
			...S.S,
			delay:
				<A>(_milliseconds: number) =>
				<State>(value: S.State<State, A>) =>
					value,
		};
		const sequenced = sequenceT2(S.S)([first, second]);
		const concurrent = concurrency2(stateWithDelay)()([first, second]);

		expectTypeOf(sequenced).toEqualTypeOf<S.State<string, [number, string]>>();
		expectTypeOf(concurrent).toEqualTypeOf<S.State<string, [number, string]>>();
	});

	it("supports heterogeneous Kind3 arrays through legacy sequenceT", () => {
		const first = RTE.of<DatabaseContext, number, DomainError>(1);
		const second = RTE.of<LoggerContext, string, ApiError>("two");
		const tasks = [first, second];
		const result = sequenceT(RTE)(tasks);

		expectTypeOf(result).toEqualTypeOf<
			RTE.ReaderTaskEither<
				DatabaseContext & LoggerContext,
				DomainError | ApiError,
				(number | string)[]
			>
		>();
	});
});
