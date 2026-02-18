/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import * as IO from "../lib/io";
import { describe, it, expect } from "vitest";

describe("IO", () => {
	describe("Basic operations", () => {
		it("should create and run an IO", () => {
			const io = IO.of(42);
			const result = IO.run(io);
			expect(result).toBe(42);
		});

		it("should create IO from a thunk", () => {
			const io = IO.from(() => "hello world");
			const result = IO.run(io);
			expect(result).toBe("hello world");
		});
	});

	describe("Functor operations", () => {
		it("should map over IO values", () => {
			const io = IO.of(10);
			const mapped = IO.map((x: number) => x * 2)(io);
			const result = IO.run(mapped);
			expect(result).toBe(20);
		});

		it("should chain multiple maps", () => {
			const io = IO.of(5);
			const result = IO.run(IO.map((x: number) => x + 1)(IO.map((x: number) => x * 2)(io)));
			expect(result).toBe(11); // (5 * 2) + 1
		});
	});

	describe("Monad operations", () => {
		it("should chain IO computations", () => {
			const io = IO.of(5);
			const chained = IO.chain((x: number) => IO.of(x * 2))(io);
			const result = IO.run(chained);
			expect(result).toBe(10);
		});

		it("should join nested IO", () => {
			const nested = IO.of(IO.of(42));
			const joined = IO.join(nested);
			const result = IO.run(joined);
			expect(result).toBe(42);
		});

		it("should work with complex chaining", () => {
			const io1 = IO.of(3);
			const io2 = IO.chain((x: number) => IO.chain((y: number) => IO.of(x + y))(IO.of(x * 2)))(io1);

			const result = IO.run(io2);
			expect(result).toBe(9); // 3 + (3 * 2)
		});
	});

	describe("Applicative operations", () => {
		it("should apply function IO to value IO", () => {
			const fnIO = IO.of((x: number) => x * 3);
			const valueIO = IO.of(7);
			const applied = IO.apply(fnIO)(valueIO);
			const result = IO.run(applied);
			expect(result).toBe(21);
		});
	});

	describe("Side effects", () => {
		it("should execute side effects with tap", () => {
			let sideEffectValue: number | null = null;
			const io = IO.of(100);
			const tapped = IO.tap((x: number) => {
				sideEffectValue = x;
			})(io);

			expect(sideEffectValue).toBe(null); // No side effect yet
			const result = IO.run(tapped);
			expect(result).toBe(100); // Original value preserved
			expect(sideEffectValue).toBe(100); // Side effect executed
		});
	});

	describe("Error handling", () => {
		it("should handle errors with catchError", () => {
			const errorIO = IO.throwError<number>(new Error("Test error"));
			const handled = IO.catchError<number>(() => 42)(errorIO);
			const result = IO.run(handled);
			expect(result).toBe(42);
		});

		it("should propagate errors when not caught", () => {
			const errorIO = IO.throwError<number>(new Error("Test error"));
			expect(() => IO.run(errorIO)).toThrow("Test error");
		});

		it("should catch errors from computations", () => {
			const riskyIO = IO.from(() => {
				throw new Error("Computation failed");
			});

			const handled = IO.catchError<string>((error) => `Error: ${error.message}`)(riskyIO);
			const result = IO.run(handled);
			expect(result).toBe("Error: Computation failed");
		});
	});

	describe("Sequencing", () => {
		it("should sequence with andThen", () => {
			let executed = false;
			const io1 = IO.of(1);
			const io2 = IO.from(() => {
				executed = true;
			});

			const sequenced = IO.andThen(io2)(io1);
			expect(executed).toBe(false);

			IO.run(sequenced);
			expect(executed).toBe(true);
		});

		it("should sequence with andThenDiscard", () => {
			let executed = false;
			const io1 = IO.of(42);
			const io2 = IO.from(() => {
				executed = true;
			});

			const sequenced = IO.andThenDiscard(io2)(io1);
			const result = IO.run(sequenced);

			expect(result).toBe(42); // Original value preserved
			expect(executed).toBe(true); // Side effect executed
		});

		it("should sequence arrays of IO", () => {
			const ios = [IO.of(1), IO.of(2), IO.of(3)];
			const sequenced = IO.sequence(ios);
			const result = IO.run(sequenced);
			expect(result).toEqual([1, 2, 3]);
		});
	});

	describe("Utility functions", () => {
		it("should convert sync functions to IO", () => {
			const add = (a: number, b: number) => a + b;
			const addIO = IO.fromSync(add);
			const result = IO.run(addIO(5, 3));
			expect(result).toBe(8);
		});

		it("should work with from for lazy evaluation", () => {
			let callCount = 0;
			const lazyIO = IO.from(() => {
				callCount++;
				return "lazy value";
			});

			expect(callCount).toBe(0); // Not called yet
			const result1 = IO.run(lazyIO);
			expect(callCount).toBe(1); // Called once
			expect(result1).toBe("lazy value");

			const result2 = IO.run(lazyIO);
			expect(callCount).toBe(2); // Called again (not memoized)
			expect(result2).toBe("lazy value");
		});
	});

	describe("Laws", () => {
		it("should satisfy left identity law", () => {
			const a = 42;
			const f = (x: number) => IO.of(x * 2);

			const left = IO.run(IO.chain(f)(IO.of(a)));
			const right = IO.run(f(a));

			expect(left).toBe(right);
		});

		it("should satisfy right identity law", () => {
			const m = IO.of(42);

			const left = IO.run(IO.chain(IO.of)(m));
			const right = IO.run(m);

			expect(left).toBe(right);
		});

		it("should satisfy associativity law", () => {
			const m = IO.of(5);
			const f = (x: number) => IO.of(x * 2);
			const g = (x: number) => IO.of(x + 1);

			const left = IO.run(IO.chain(g)(IO.chain(f)(m)));
			const right = IO.run(IO.chain((x: number) => IO.chain(g)(f(x)))(m));

			expect(left).toBe(right);
		});
	});
});
