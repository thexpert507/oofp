/**
 * Shared simulation functions for orchestration benchmarks.
 * Each "async operation" uses Promise.resolve() to simulate a microtask
 * (real async boundary) without real I/O delay — we measure orchestration overhead.
 */

// ── Simulated async I/O (microtask boundary) ────────────────────

/** Simulates a successful async fetch/DB call */
export const asyncOp = <A>(value: A): Promise<A> => Promise.resolve(value);

// ── Domain types for pipeline simulation ────────────────────────

export interface User {
	id: number;
	name: string;
	role: string;
}

export interface Permission {
	userId: number;
	canAccess: boolean;
}

export interface ParsedInput {
	query: string;
	filters: string[];
}

export interface EnrichedData {
	query: string;
	filters: string[];
	metadata: { timestamp: number; source: string };
}

export interface TransformedData {
	result: string;
	score: number;
}

export interface SavedRecord {
	id: string;
	data: TransformedData;
	savedAt: number;
}

export interface Notification {
	recordId: string;
	sent: boolean;
}

// ── Simulated steps (pure computation + async boundary) ─────────

export const fetchUserRaw = (): Promise<User> =>
	asyncOp({ id: 1, name: "John", role: "admin" });

export const validatePermissionsRaw = (user: User): Promise<Permission> =>
	asyncOp({ userId: user.id, canAccess: user.role === "admin" });

export const parseInputRaw = (perm: Permission): Promise<ParsedInput> =>
	perm.canAccess
		? asyncOp({ query: "search", filters: ["active", "recent"] })
		: Promise.reject("no access");

export const enrichDataRaw = (input: ParsedInput): Promise<EnrichedData> =>
	asyncOp({ ...input, metadata: { timestamp: Date.now(), source: "api" } });

export const transformDataRaw = (data: EnrichedData): Promise<TransformedData> =>
	asyncOp({ result: `${data.query}:${data.filters.join(",")}`, score: 42 });

export const saveRecordRaw = (data: TransformedData): Promise<SavedRecord> =>
	asyncOp({ id: "rec-1", data, savedAt: Date.now() });

export const notifyResultRaw = (record: SavedRecord): Promise<Notification> =>
	asyncOp({ recordId: record.id, sent: true });

// ── Parallel fetch simulations ──────────────────────────────────

export const fetchCandidateRaw = () => asyncOp({ id: 1, name: "Alice" });
export const fetchProjectRaw = () => asyncOp({ id: 10, title: "Project X" });
export const fetchApplicationRaw = () => asyncOp({ id: 100, status: "pending" });
export const fetchConfigRaw = () => asyncOp({ maxRetries: 3, timeout: 5000 });
export const fetchTemplateRaw = () => asyncOp({ id: "tmpl-1", body: "Hello {{name}}" });

// ── Batch operation simulation (for concurrency benchmarks) ─────

export const processItemRaw = (i: number): Promise<{ index: number; processed: boolean }> =>
	asyncOp({ index: i, processed: true });

// ── Side effect simulation (fire-and-forget) ────────────────────

export const logToAnalyticsRaw = (_data: unknown): Promise<void> => asyncOp(undefined);
export const sendNotificationRaw = (_data: unknown): Promise<void> => asyncOp(undefined);
