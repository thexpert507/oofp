/**
 * Static maintainability analysis — imperative vs optics vs Focal API
 *
 * This file runs as a vitest bench suite but contains no timing benchmarks.
 * Instead it measures objective code-quality signals by reading the three
 * helper source files and applying regex analysis:
 *
 *   1. typeGuards          — `function isXxx(…): e is T` declarations
 *   2. spreadOperators     — lines (excluding comments) that contain `...`
 *   3. schemaCouplingPoints — hard-coded $type strings + entity field names
 *   4. filterCalls         — `.filter(` call sites
 *   5. compositionUnits    — reusable optic/focal variables at module level
 *
 * Readings are printed as a formatted table during `pnpm bench`.
 * The single `bench` call is a no-op (1 iteration, 0 ms) — its only purpose
 * is to appear in vitest's output so the analysis runs in the bench context.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { bench, describe } from "vitest";

// ── Path resolution ───────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const helpersDir = resolve(__dirname, "_helpers");

function readSource(filename: string): string {
	return readFileSync(resolve(helpersDir, filename), "utf-8");
}

// ── Utility: strip single-line comments before counting ──────────────────────

function stripComments(src: string): string {
	// Remove // line comments (not inside strings — good enough for our sources)
	return src
		.split("\n")
		.map((line) => line.replace(/\/\/.*$/, ""))
		.join("\n");
}

// ── Metric extractors ─────────────────────────────────────────────────────────

/** Type guard function declarations: `function isXxx(…): e is T` */
function countTypeGuards(src: string): number {
	return (src.match(/function\s+is[A-Z]\w+/g) ?? []).length;
}

/** Lines (no comments) containing spread `...` */
function countSpreadOperators(src: string): number {
	const clean = stripComments(src);
	return clean.split("\n").filter((line) => /\.\.\./.test(line)).length;
}

/**
 * Schema coupling points: hard-coded `$type` string literals
 * (com.linkedin.voyager.dash…) plus entity field names accessed as
 * string literals ("firstName", "lastName", "name", "title", etc.)
 */
function countSchemaCouplingPoints(src: string): number {
	const typeStrings = (src.match(/"com\.linkedin\.voyager[^"]*"/g) ?? []).length;
	const fieldStrings = (
		src.match(/"(?:firstName|lastName|name|title|companyName|authority|proficiency|schoolName|fieldOfStudy|multiLocaleSummary|\$type)"/g) ?? []
	).length;
	return typeStrings + fieldStrings;
}

/** `.filter(` call sites */
function countFilterCalls(src: string): number {
	return (src.match(/\.filter\(/g) ?? []).length;
}

/**
 * Module-level composition units: const declarations at the top level that
 * hold optic/focal values (Lens, Prism, Traversal, compose, pipe result).
 * Proxy: count `^const \w+ =` lines outside any function body.
 *
 * Heuristic: we count `const` lines that appear before the first `export function`
 * line — good enough for our three well-structured files.
 */
function countCompositionUnits(src: string): number {
	const lines = src.split("\n");
	const firstExportFnIdx = lines.findIndex((l) => /^export function|^function /.test(l));
	const moduleLevel = firstExportFnIdx === -1 ? lines : lines.slice(0, firstExportFnIdx);
	return moduleLevel.filter((l) => /^\s*const\s+\w+/.test(l)).length;
}

// ── Analysis ──────────────────────────────────────────────────────────────────

interface Metrics {
	label: string;
	typeGuards: number;
	spreadOperators: number;
	schemaCouplingPoints: number;
	filterCalls: number;
	compositionUnits: number;
}

function analyse(label: string, filename: string): Metrics {
	const src = readSource(filename);
	return {
		label,
		typeGuards: countTypeGuards(src),
		spreadOperators: countSpreadOperators(src),
		schemaCouplingPoints: countSchemaCouplingPoints(src),
		filterCalls: countFilterCalls(src),
		compositionUnits: countCompositionUnits(src),
	};
}

// ── Report ────────────────────────────────────────────────────────────────────

function pad(s: string | number, width: number, right = false): string {
	const str = String(s);
	const padding = " ".repeat(Math.max(0, width - str.length));
	return right ? padding + str : str + padding;
}

function printReport(results: Metrics[]): void {
	const cols = [
		{ key: "label", header: "Implementation", width: 22, numeric: false },
		{ key: "typeGuards", header: "Type Guards", width: 12, numeric: true },
		{ key: "spreadOperators", header: "Spreads", width: 9, numeric: true },
		{ key: "schemaCouplingPoints", header: "Schema Coupling", width: 16, numeric: true },
		{ key: "filterCalls", header: "Filter Calls", width: 13, numeric: true },
		{ key: "compositionUnits", header: "Comp. Units", width: 12, numeric: true },
	] as const;

	const separator = cols.map((c) => "-".repeat(c.width)).join("-+-");
	const header = cols.map((c) => pad(c.header, c.width, c.numeric)).join(" | ");

	console.log("\n");
	console.log("  Maintainability Analysis — static metrics across implementations");
	console.log("  " + "=".repeat(separator.length));
	console.log("  " + header);
	console.log("  " + separator);

	for (const r of results) {
		const row = cols
			.map((c) => pad(r[c.key as keyof Metrics], c.width, c.numeric))
			.join(" | ");
		console.log("  " + row);
	}

	console.log("  " + separator);
	console.log("\n  Metrics (lower is generally better for maintenance burden):");
	console.log("    Type Guards        — `function isXxx(): e is T` declarations");
	console.log("    Spreads            — lines containing `...` (outside comments)");
	console.log("    Schema Coupling    — hard-coded $type strings + entity field names");
	console.log("    Filter Calls       — `.filter(` call sites");
	console.log("    Comp. Units        — reusable optic/focal consts at module level");
	console.log("\n");
}

// ── Run analysis at module load time (before the bench suite) ─────────────────

const results: Metrics[] = [
	analyse("imperative", "imperative.ts"),
	analyse("optics (pure)", "focal-impl.ts"),
	analyse("Focal API", "focal-api-impl.ts"),
];

printReport(results);

// ── Vitest bench suite (no-op timing, analysis already printed above) ─────────

describe("Maintainability — static code metrics", () => {
	bench(
		"static analysis (see table above)",
		() => {
			// No-op: the actual analysis runs at module load time above.
			// This bench entry exists only to appear in the vitest bench report.
		},
		{ iterations: 1 },
	);
});
