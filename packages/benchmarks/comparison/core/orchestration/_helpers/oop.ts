/**
 * Hand-rolled OOP ResultAsync for orchestration benchmarks
 */
import type {
	User,
	Permission,
	ParsedInput,
	EnrichedData,
	TransformedData,
	SavedRecord,
	Notification,
} from "./shared.ts";
import {
	fetchUserRaw,
	validatePermissionsRaw,
	parseInputRaw,
	enrichDataRaw,
	transformDataRaw,
	saveRecordRaw,
	notifyResultRaw,
	fetchCandidateRaw,
	fetchProjectRaw,
	fetchApplicationRaw,
	fetchConfigRaw,
	fetchTemplateRaw,
	processItemRaw,
	logToAnalyticsRaw,
	sendNotificationRaw,
} from "./shared.ts";

// ── OOP Result types ────────────────────────────────────────────

class Result<T, E> {
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
	unwrap(): T {
		return this._value as T;
	}
	unwrapErr(): E {
		return this._value as E;
	}
}

class ResultAsync<T, E> {
	constructor(private readonly _promise: Promise<Result<T, E>>) {}

	static ok<T, E = never>(value: T): ResultAsync<T, E> {
		return new ResultAsync(Promise.resolve(Result.ok<T, E>(value)));
	}
	static err<T = never, E = unknown>(error: E): ResultAsync<T, E> {
		return new ResultAsync(Promise.resolve(Result.err<T, E>(error)));
	}
	static fromPromise<T, E>(fn: () => Promise<T>, mapErr: (e: unknown) => E): ResultAsync<T, E> {
		return new ResultAsync(
			fn()
				.then((v) => Result.ok<T, E>(v))
				.catch((e) => Result.err<T, E>(mapErr(e))),
		);
	}
	static all<T, E>(items: ResultAsync<T, E>[]): ResultAsync<T[], E> {
		return new ResultAsync(
			Promise.all(items.map((r) => r.run())).then((results) => {
				const values: T[] = [];
				for (const r of results) {
					if (!r.isOk()) return Result.err<T[], E>(r.unwrapErr());
					values.push(r.unwrap());
				}
				return Result.ok<T[], E>(values);
			}),
		);
	}

	map<U>(fn: (value: T) => U): ResultAsync<U, E> {
		return new ResultAsync(
			this._promise.then((r) =>
				r.isOk() ? Result.ok<U, E>(fn(r.unwrap())) : Result.err<U, E>(r.unwrapErr()),
			),
		);
	}
	flatMap<U>(fn: (value: T) => ResultAsync<U, E>): ResultAsync<U, E> {
		return new ResultAsync(
			this._promise.then((r) => (r.isOk() ? fn(r.unwrap()).run() : Result.err<U, E>(r.unwrapErr()))),
		);
	}
	orElse(fn: (error: E) => ResultAsync<T, E>): ResultAsync<T, E> {
		return new ResultAsync(
			this._promise.then((r) => (r.isOk() ? r : fn(r.unwrapErr()).run())),
		);
	}
	tap(fn: (value: T) => void): ResultAsync<T, E> {
		return new ResultAsync(
			this._promise.then((r) => {
				if (r.isOk()) fn(r.unwrap());
				return r;
			}),
		);
	}
	run(): Promise<Result<T, E>> {
		return this._promise;
	}
}

// ── Lift raw promises ───────────────────────────────────────────

const toRA = <A>(fn: () => Promise<A>): ResultAsync<A, string> =>
	ResultAsync.fromPromise(fn, (e) => String(e));

const fetchUser = toRA(fetchUserRaw);

const validatePermissions = (user: User): ResultAsync<Permission, string> =>
	toRA(() => validatePermissionsRaw(user));

const parseInput = (perm: Permission): ResultAsync<ParsedInput, string> =>
	toRA(() => parseInputRaw(perm));

const enrichData = (input: ParsedInput): ResultAsync<EnrichedData, string> =>
	toRA(() => enrichDataRaw(input));

const transformData = (data: EnrichedData): ResultAsync<TransformedData, string> =>
	toRA(() => transformDataRaw(data));

const saveRecord = (data: TransformedData): ResultAsync<SavedRecord, string> =>
	toRA(() => saveRecordRaw(data));

const notifyResult = (record: SavedRecord): ResultAsync<Notification, string> =>
	toRA(() => notifyResultRaw(record));

// ── 1. Sequential 7-step pipeline ──────────────────────────────

export const sequentialPipeline = fetchUser
	.flatMap(validatePermissions)
	.flatMap(parseInput)
	.flatMap(enrichData)
	.flatMap(transformData)
	.flatMap(saveRecord)
	.flatMap(notifyResult);

// ── 2. Parallel execution ───────────────────────────────────────

const fetchCandidate = toRA(fetchCandidateRaw);
const fetchProject = toRA(fetchProjectRaw);
const fetchApplication = toRA(fetchApplicationRaw);
const fetchConfig = toRA(fetchConfigRaw);
const fetchTemplate = toRA(fetchTemplateRaw);

// biome-ignore lint/suspicious/noExplicitAny: heterogeneous tuple requires any cast for ResultAsync.all
export const parallelExecution: ResultAsync<unknown[], string> = ResultAsync.all([
	fetchCandidate as ResultAsync<unknown, string>,
	fetchProject as ResultAsync<unknown, string>,
	fetchApplication as ResultAsync<unknown, string>,
	fetchConfig as ResultAsync<unknown, string>,
	fetchTemplate as ResultAsync<unknown, string>,
]);

// ── 3. Controlled concurrency (manual batching) ─────────────────

export const controlledConcurrency = (count: number, maxConcurrent: number) => {
	const items = Array.from({ length: count }, (_, i) => i);
	const chunks: number[][] = [];
	for (let i = 0; i < items.length; i += maxConcurrent) {
		chunks.push(items.slice(i, i + maxConcurrent));
	}

	let result: ResultAsync<{ index: number; processed: boolean }[], string> = ResultAsync.ok([]);
	for (const chunk of chunks) {
		result = result.flatMap((prev) =>
			ResultAsync.all(chunk.map((i) => toRA(() => processItemRaw(i)))).map(
				(chunkResults) => [...prev, ...chunkResults],
			),
		);
	}
	return result;
};

// ── 4. Error recovery (orElse) ──────────────────────────────────

const fetchFromCache: ResultAsync<{ id: number; name: string }, string> =
	ResultAsync.err("cache miss");

const fetchFromDb: ResultAsync<{ id: number; name: string }, string> =
	ResultAsync.err("db error");

const createDefault: ResultAsync<{ id: number; name: string }, string> =
	ResultAsync.ok({ id: 0, name: "default" });

const enrichRecord = (r: { id: number; name: string }): ResultAsync<{ id: number; name: string; enriched: boolean }, string> =>
	ResultAsync.ok({ ...r, enriched: true });

const saveEnriched = (r: { id: number; name: string; enriched: boolean }): ResultAsync<{ saved: boolean; record: typeof r }, string> =>
	ResultAsync.ok({ saved: true, record: r });

export const errorRecoveryPipeline = fetchFromCache
	.orElse(() => fetchFromDb)
	.orElse(() => createDefault)
	.flatMap(enrichRecord)
	.flatMap(saveEnriched);

// ── 5. Middleware wrapper ───────────────────────────────────────

const checkCredits = toRA(() => Promise.resolve({ credits: 10 }));
const deductCredits = (_amount: number) => toRA(() => Promise.resolve(undefined));
const rollbackCredits = (_amount: number) => toRA(() => Promise.resolve(undefined));

export const withCredits = <A>(
	mainPipeline: ResultAsync<A, string>,
): ResultAsync<A, string> =>
	checkCredits.flatMap((creds) =>
		mainPipeline
			.flatMap((result) => deductCredits(creds.credits).map(() => result))
			.orElse((err) =>
				rollbackCredits(creds.credits).flatMap(() => ResultAsync.err(err)),
			),
	);

export const middlewarePipeline = withCredits(
	ResultAsync.ok<string, string>("input")
		.flatMap((s) => toRA(() => transformDataRaw({ query: s, filters: [], metadata: { timestamp: 0, source: "" } })))
		.flatMap((d) => toRA(() => saveRecordRaw(d))),
);

// ── 6. Fire-and-forget side effects ─────────────────────────────

export const fireAndForgetPipeline = fetchUser
	.flatMap(validatePermissions)
	.flatMap(parseInput)
	.flatMap(enrichData)
	.flatMap(transformData)
	.flatMap(saveRecord)
	.tap((record) => {
		logToAnalyticsRaw(record).catch(() => void 0);
		sendNotificationRaw(record).catch(() => void 0);
	});

// ── Run helper ──────────────────────────────────────────────────

export const runRA = <T, E>(ra: ResultAsync<T, E>) => ra.run();
