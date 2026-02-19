// Hand-rolled OOP Result<T,E> class with method chaining

export class Result<T, E> {
	private constructor(
		private readonly _ok: boolean,
		private readonly _value: T | E,
	) {}

	static ok<T, E = never>(value: T): Result<T, E> {
		return new Result<T, E>(true, value);
	}

	static err<T = never, E = unknown>(error: E): Result<T, E> {
		return new Result<T, E>(false, error);
	}

	isOk(): boolean {
		return this._ok;
	}

	map<U>(fn: (value: T) => U): Result<U, E> {
		return this._ok
			? Result.ok<U, E>(fn(this._value as T))
			: (this as unknown as Result<U, E>);
	}

	flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
		return this._ok ? fn(this._value as T) : (this as unknown as Result<U, E>);
	}

	fold<U>(onErr: (error: E) => U, onOk: (value: T) => U): U {
		return this._ok ? onOk(this._value as T) : onErr(this._value as E);
	}

	orElse(fn: (error: E) => Result<T, E>): Result<T, E> {
		return this._ok ? this : fn(this._value as E);
	}
}

// ── Creation ────────────────────────────────────────────────────

export const createSuccess = (v: number) => Result.ok<number, string>(v);
export const createFailure = (e: string) => Result.err<number, string>(e);

// ── Pipeline (5-step) ───────────────────────────────────────────

const parse = (s: string): Result<number, string> => {
	const n = Number(s);
	return Number.isNaN(n) ? Result.err("parse error") : Result.ok(n);
};
const validateRange = (n: number): Result<number, string> =>
	n >= 0 && n <= 1000 ? Result.ok(n) : Result.err("out of range");
const double = (n: number): number => n * 2;
const validateEven = (n: number): Result<number, string> =>
	n % 2 === 0 ? Result.ok(n) : Result.err("not even");
const format = (n: number): string => `Result: ${n}`;

export const pipeline = (input: string): Result<string, string> =>
	parse(input)
		.flatMap(validateRange)
		.map(double)
		.flatMap(validateEven)
		.map(format);

// ── Error handling ──────────────────────────────────────────────

export const handleSuccess = (input: string): string =>
	parse(input)
		.flatMap(validateRange)
		.map(double)
		.fold(
			() => "error",
			(n) => `ok: ${n}`,
		);

export const handleFailure = (input: string): string =>
	parse(input)
		.flatMap(validateRange)
		.map(double)
		.fold(
			() => "error",
			(n) => `ok: ${n}`,
		);

export const handleRecovery = (input: string): Result<number, string> =>
	parse(input)
		.flatMap(validateRange)
		.orElse(() => Result.ok<number, string>(0));

// ── Async pipeline ──────────────────────────────────────────────

class ResultAsync<T, E> {
	constructor(private readonly _promise: Promise<Result<T, E>>) {}

	static ok<T, E = never>(value: T): ResultAsync<T, E> {
		return new ResultAsync(Promise.resolve(Result.ok<T, E>(value)));
	}

	static err<T = never, E = unknown>(error: E): ResultAsync<T, E> {
		return new ResultAsync(Promise.resolve(Result.err<T, E>(error)));
	}

	map<U>(fn: (value: T) => U): ResultAsync<U, E> {
		return new ResultAsync(this._promise.then((r) => r.map(fn)));
	}

	flatMap<U>(fn: (value: T) => ResultAsync<U, E>): ResultAsync<U, E> {
		return new ResultAsync(
			this._promise.then((r) =>
				r.isOk()
					? fn(r.fold(() => undefined as never, (v) => v)).run()
					: (r as unknown as Result<U, E>),
			),
		);
	}

	run(): Promise<Result<T, E>> {
		return this._promise;
	}
}

const asyncParse = (s: string): ResultAsync<number, string> => {
	const n = Number(s);
	return n >= 0 ? ResultAsync.ok(n) : ResultAsync.err("parse error");
};
const asyncValidate = (n: number): ResultAsync<number, string> =>
	n <= 1000 ? ResultAsync.ok(n) : ResultAsync.err("out of range");
const asyncTransform = (n: number): ResultAsync<number, string> => ResultAsync.ok(n * 2);

export const asyncPipeline = (input: string): ResultAsync<string, string> =>
	asyncParse(input)
		.flatMap(asyncValidate)
		.flatMap(asyncTransform)
		.map(format);

export const runAsync = <T, E>(ra: ResultAsync<T, E>) => ra.run();
