/**
 * neverthrow orchestration helpers using ResultAsync
 */
import { okAsync, errAsync, ResultAsync } from "neverthrow";
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

// ── Lift raw promises into ResultAsync ──────────────────────────

const toRA = <A>(fn: () => Promise<A>): ResultAsync<A, string> =>
	ResultAsync.fromPromise(fn(), (e) => String(e));

const fetchUser: ResultAsync<User, string> = toRA(fetchUserRaw);

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

export const sequentialPipeline: ResultAsync<Notification, string> = fetchUser
	.andThen(validatePermissions)
	.andThen(parseInput)
	.andThen(enrichData)
	.andThen(transformData)
	.andThen(saveRecord)
	.andThen(notifyResult);

// ── 2. Parallel execution (ResultAsync.combine) ─────────────────

const fetchCandidate = toRA(fetchCandidateRaw);
const fetchProject = toRA(fetchProjectRaw);
const fetchApplication = toRA(fetchApplicationRaw);
const fetchConfig = toRA(fetchConfigRaw);
const fetchTemplate = toRA(fetchTemplateRaw);

export const parallelExecution = ResultAsync.combine([
	fetchCandidate,
	fetchProject,
	fetchApplication,
	fetchConfig,
	fetchTemplate,
]);

// ── 3. Controlled concurrency (manual batching — no native support)

export const controlledConcurrency = (count: number, maxConcurrent: number) => {
	const items = Array.from({ length: count }, (_, i) => i);
	const chunks: number[][] = [];
	for (let i = 0; i < items.length; i += maxConcurrent) {
		chunks.push(items.slice(i, i + maxConcurrent));
	}

	let result: ResultAsync<{ index: number; processed: boolean }[], string> = okAsync([]);
	for (const chunk of chunks) {
		result = result.andThen((prev) =>
			ResultAsync.combine(
				chunk.map((i) => toRA(() => processItemRaw(i))),
			).map((chunkResults) => [...prev, ...chunkResults]),
		);
	}
	return result;
};

// ── 4. Error recovery (orElse) ──────────────────────────────────

const fetchFromCache: ResultAsync<{ id: number; name: string }, string> =
	errAsync("cache miss");

const fetchFromDb: ResultAsync<{ id: number; name: string }, string> =
	errAsync("db error");

const createDefault: ResultAsync<{ id: number; name: string }, string> =
	okAsync({ id: 0, name: "default" });

const enrichRecord = (r: { id: number; name: string }): ResultAsync<{ id: number; name: string; enriched: boolean }, string> =>
	okAsync({ ...r, enriched: true });

const saveEnriched = (r: { id: number; name: string; enriched: boolean }): ResultAsync<{ saved: boolean; record: typeof r }, string> =>
	okAsync({ saved: true, record: r });

export const errorRecoveryPipeline = fetchFromCache
	.orElse(() => fetchFromDb)
	.orElse(() => createDefault)
	.andThen(enrichRecord)
	.andThen(saveEnriched);

// ── 5. Middleware wrapper (manual composition) ──────────────────

const checkCredits: ResultAsync<{ credits: number }, string> = okAsync({ credits: 10 });

const deductCredits = (_amount: number): ResultAsync<void, string> =>
	okAsync(undefined);

const rollbackCredits = (_amount: number): ResultAsync<void, string> =>
	okAsync(undefined);

export const withCredits = <A>(
	mainPipeline: ResultAsync<A, string>,
): ResultAsync<A, string> =>
	checkCredits.andThen((creds) =>
		mainPipeline
			.andThen((result) => deductCredits(creds.credits).map(() => result))
			.orElse((err) => rollbackCredits(creds.credits).andThen(() => errAsync(err))),
	);

export const middlewarePipeline = withCredits(
	okAsync("input" as string)
		.andThen((s) => toRA(() => transformDataRaw({ query: s, filters: [], metadata: { timestamp: 0, source: "" } })))
		.andThen((d) => toRA(() => saveRecordRaw(d))),
);

// ── 6. Fire-and-forget side effects (manual) ────────────────────

export const fireAndForgetPipeline: ResultAsync<SavedRecord, string> = fetchUser
	.andThen(validatePermissions)
	.andThen(parseInput)
	.andThen(enrichData)
	.andThen(transformData)
	.andThen(saveRecord)
	.andThen((record) => {
		// Fire-and-forget: launch without awaiting
		logToAnalyticsRaw(record).catch(() => void 0);
		sendNotificationRaw(record).catch(() => void 0);
		return okAsync(record);
	});

// ── Run helper ──────────────────────────────────────────────────

export const runRA = <T, E>(ra: ResultAsync<T, E>) =>
	ra.match(
		(v) => v,
		() => undefined,
	);
