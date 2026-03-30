/**
 * fp-ts orchestration helpers using TaskEither
 */
import * as TE from "fp-ts/lib/TaskEither";
import * as A from "fp-ts/lib/Array";
import { pipe } from "fp-ts/lib/function";
import { sequenceT } from "fp-ts/lib/Apply";
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

// ── Lift raw promises into TaskEither ───────────────────────────

const toTE = <A>(fn: () => Promise<A>): TE.TaskEither<string, A> =>
	TE.tryCatch(fn, (e) => String(e));

const fetchUser: TE.TaskEither<string, User> = toTE(fetchUserRaw);

const validatePermissions = (user: User): TE.TaskEither<string, Permission> =>
	toTE(() => validatePermissionsRaw(user));

const parseInput = (perm: Permission): TE.TaskEither<string, ParsedInput> =>
	toTE(() => parseInputRaw(perm));

const enrichData = (input: ParsedInput): TE.TaskEither<string, EnrichedData> =>
	toTE(() => enrichDataRaw(input));

const transformData = (data: EnrichedData): TE.TaskEither<string, TransformedData> =>
	toTE(() => transformDataRaw(data));

const saveRecord = (data: TransformedData): TE.TaskEither<string, SavedRecord> =>
	toTE(() => saveRecordRaw(data));

const notifyResult = (record: SavedRecord): TE.TaskEither<string, Notification> =>
	toTE(() => notifyResultRaw(record));

// ── 1. Sequential 7-step pipeline ──────────────────────────────

export const sequentialPipeline: TE.TaskEither<string, Notification> = pipe(
	fetchUser,
	TE.chain(validatePermissions),
	TE.chain(parseInput),
	TE.chain(enrichData),
	TE.chain(transformData),
	TE.chain(saveRecord),
	TE.chain(notifyResult),
);

// ── 2. Parallel execution (applicative with sequenceT) ──────────

const fetchCandidate = toTE(fetchCandidateRaw);
const fetchProject = toTE(fetchProjectRaw);
const fetchApplication = toTE(fetchApplicationRaw);
const fetchConfig = toTE(fetchConfigRaw);
const fetchTemplate = toTE(fetchTemplateRaw);

export const parallelExecution = sequenceT(TE.ApplicativePar)(
	fetchCandidate,
	fetchProject,
	fetchApplication,
	fetchConfig,
	fetchTemplate,
);

// ── 3. Controlled concurrency (manual batching — fp-ts has none)

export const controlledConcurrency = (count: number, maxConcurrent: number) => {
	const items = Array.from({ length: count }, (_, i) => i);

	// Manual batching: split into chunks and process sequentially
	const chunks: number[][] = [];
	for (let i = 0; i < items.length; i += maxConcurrent) {
		chunks.push(items.slice(i, i + maxConcurrent));
	}

	return pipe(
		chunks,
		A.reduce(
			TE.of<string, { index: number; processed: boolean }[]>([]),
			(acc, chunk) =>
				pipe(
					acc,
					TE.chain((results) =>
						pipe(
							chunk.map((i) => toTE(() => processItemRaw(i))),
							A.sequence(TE.ApplicativePar),
							TE.map((chunkResults) => [...results, ...chunkResults]),
						),
					),
				),
		),
	);
};

// ── 4. Error recovery (orElseW) ─────────────────────────────────

const fetchFromCache: TE.TaskEither<string, { id: number; name: string }> = TE.tryCatch(
	() => Promise.reject("cache miss"),
	(e) => String(e),
);

const fetchFromDb: TE.TaskEither<string, { id: number; name: string }> = TE.tryCatch(
	() => Promise.reject("db error"),
	(e) => String(e),
);

const createDefault: TE.TaskEither<string, { id: number; name: string }> = TE.of({
	id: 0,
	name: "default",
});

const enrichRecord = (r: { id: number; name: string }): TE.TaskEither<string, { id: number; name: string; enriched: boolean }> =>
	TE.of({ ...r, enriched: true });

const saveEnriched = (r: { id: number; name: string; enriched: boolean }): TE.TaskEither<string, { saved: boolean; record: typeof r }> =>
	TE.of({ saved: true, record: r });

export const errorRecoveryPipeline = pipe(
	fetchFromCache,
	TE.orElse(() => fetchFromDb),
	TE.orElse(() => createDefault),
	TE.chain(enrichRecord),
	TE.chain(saveEnriched),
);

// ── 5. Middleware wrapper (credits pattern) ─────────────────────

const checkCredits: TE.TaskEither<string, { credits: number }> = toTE(() =>
	Promise.resolve({ credits: 10 }),
);

const deductCredits = (_amount: number): TE.TaskEither<string, void> =>
	toTE(() => Promise.resolve(undefined));

const rollbackCredits = (_amount: number): TE.TaskEither<string, void> =>
	toTE(() => Promise.resolve(undefined));

export const withCredits = <A>(
	mainPipeline: TE.TaskEither<string, A>,
): TE.TaskEither<string, A> =>
	pipe(
		checkCredits,
		TE.chain((creds) =>
			pipe(
				mainPipeline,
				TE.chain((result) =>
					pipe(
						deductCredits(creds.credits),
						TE.map(() => result),
					),
				),
				TE.orElse((err) =>
					pipe(
						rollbackCredits(creds.credits),
						TE.chain(() => TE.left(err)),
					),
				),
			),
		),
	);

export const middlewarePipeline = withCredits(
	pipe(
		TE.of<string, string>("input"),
		TE.chain((s) => toTE(() => transformDataRaw({ query: s, filters: [], metadata: { timestamp: 0, source: "" } }))),
		TE.chain((d) => toTE(() => saveRecordRaw(d))),
	),
);

// ── 6. Fire-and-forget side effects (manual — fp-ts has no tapAsync)

export const fireAndForgetPipeline: TE.TaskEither<string, SavedRecord> = pipe(
	fetchUser,
	TE.chain(validatePermissions),
	TE.chain(parseInput),
	TE.chain(enrichData),
	TE.chain(transformData),
	TE.chain(saveRecord),
	TE.chainFirst((record) => {
		// Fire-and-forget: launch without awaiting
		logToAnalyticsRaw(record).catch(() => void 0);
		sendNotificationRaw(record).catch(() => void 0);
		return TE.of<string, void>(undefined);
	}),
);

// ── Run helper ──────────────────────────────────────────────────

export const runTE = <E, A>(te: TE.TaskEither<E, A>) => te();
